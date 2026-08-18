import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import sharp from 'sharp';

import {
  PPTX_MAX_SLIDES,
  PPTX_PDF_DOWNLOAD_TIMEOUT_MS,
  PPTX_PDF_MAX_BYTES,
  PPTX_PDF_METADATA_TIMEOUT_MS,
  PPTX_SLIDE_MAX_WIDTH,
  PPTX_SLIDE_RENDER_DPI,
  PPTX_SLIDE_WEBP_QUALITY,
} from '../media.constants';
import {
  PptxRenderResult,
  PptxRenderer,
  setPptxRenderer,
} from '../../apps/connectors/powerpoint/pptx-renderer.registry';
import { R2StorageService } from './r2-storage.service';

const execFileP = promisify(execFile);

const GRAPH_DRIVES_URL = 'https://graph.microsoft.com/v1.0/drives';
const MAX_REDIRECTS = 3;
/** poppler subprocess wall-clock cap; a hung render must not pin a worker. */
const PDFTOPPM_TIMEOUT_MS = 120 * 1000;

/**
 * Renders a PowerPoint deck to a set of WebP slide images for the signage
 * slideshow. Microsoft Graph converts `.pptx → PDF` for us (no LibreOffice
 * needed); poppler's `pdftoppm` rasterizes each page and sharp re-encodes to
 * WebP. Everything is staged in a temp dir that is always cleaned up.
 *
 * Registers itself with the connector-facing {@link PptxRenderer} registry on
 * module init so the plain-object PowerPoint connector can reach it.
 *
 * Requires the `poppler-utils` package (`pdftoppm`) on the host/image.
 */
@Injectable()
export class PptxRenderService implements OnModuleInit, PptxRenderer {
  private readonly logger = new Logger(PptxRenderService.name);

  constructor(private readonly r2: R2StorageService) {}

  onModuleInit(): void {
    setPptxRenderer(this);
  }

  /**
   * Write credentials alone are not enough. This service exists to hand players
   * a permanent public URL, so without `R2_PUBLIC_URL` it can store the bytes
   * and never address them. Checking only the client is how a deck got exported
   * slide by slide, mirrored to R2, and only THEN failed — on a generic
   * "provider returned an error", after spending the upstream quota.
   */
  isConfigured(): boolean {
    return this.r2.isConfigured() && this.r2.hasPublicUrl();
  }

  publicUrl(key: string): string | undefined {
    return this.r2.getPublicUrl(key);
  }

  async deleteSlides(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.r2.deleteObjects(keys);
  }

  async render(params: {
    accessToken: string;
    driveId: string;
    itemId: string;
    keyPrefix: string;
    signal?: AbortSignal;
  }): Promise<PptxRenderResult> {
    if (!this.isConfigured()) {
      throw new Error('pptx render: R2 storage is not configured');
    }

    const pdf = await this.downloadPdf(params);
    const dir = await mkdtemp(join(tmpdir(), 'pptx-render-'));
    const pdfPath = join(dir, `${randomUUID()}.pdf`);

    try {
      await writeFile(pdfPath, pdf);
      await this.rasterize(pdfPath, dir, params.signal);

      const pngs = (await readdir(dir))
        .filter((name) => /^slide-\d+\.png$/i.test(name))
        .sort((a, b) => slideIndex(a) - slideIndex(b));
      if (pngs.length === 0) {
        throw new Error('pptx render: pdftoppm produced no pages');
      }

      const slideKeys: string[] = [];
      let width: number | undefined;
      let height: number | undefined;

      for (let i = 0; i < pngs.length; i++) {
        const pngBuffer = await readFile(join(dir, pngs[i]));
        const { data, info } = await sharp(pngBuffer)
          .rotate()
          .resize({ width: PPTX_SLIDE_MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: PPTX_SLIDE_WEBP_QUALITY })
          .toBuffer({ resolveWithObject: true });
        if (i === 0) {
          width = info.width;
          height = info.height;
        }
        const key = `${params.keyPrefix}/slide-${String(i).padStart(3, '0')}.webp`;
        await this.r2.uploadObject(key, data, 'image/webp');
        slideKeys.push(key);
      }

      this.logger.debug(
        `Rendered ${String(slideKeys.length)} slides for ${params.itemId}`,
      );
      return {
        slideKeys,
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /** `pdftoppm -png -r <dpi> -l <max> <pdf> <dir>/slide` → `slide-NN.png`. */
  private async rasterize(
    pdfPath: string,
    dir: string,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      await execFileP(
        'pdftoppm',
        [
          '-png',
          '-r',
          String(PPTX_SLIDE_RENDER_DPI),
          // Cap the last page so a huge deck can't exhaust CPU/storage.
          '-l',
          String(PPTX_MAX_SLIDES),
          pdfPath,
          join(dir, 'slide'),
        ],
        {
          timeout: PDFTOPPM_TIMEOUT_MS,
          ...(signal ? { signal } : {}),
        },
      );
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new Error(
          'pptx render: `pdftoppm` not found — install poppler-utils on the host/image',
        );
      }
      throw error;
    }
  }

  /**
   * Fetch the deck as a PDF via Graph's format conversion. Graph replies 302 to
   * a short-lived, pre-authenticated download URL; we follow it manually and
   * NEVER resend the bearer token across the redirect (the target is a Microsoft
   * CDN host, not graph.microsoft.com).
   */
  private async downloadPdf(params: {
    accessToken: string;
    driveId: string;
    itemId: string;
    signal?: AbortSignal;
  }): Promise<Buffer> {
    let current = `${GRAPH_DRIVES_URL}/${encodeURIComponent(
      params.driveId,
    )}/items/${encodeURIComponent(params.itemId)}/content?format=pdf`;
    let useAuth = true;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      assertHttps(current);
      const response = await fetchWithTimeout(
        current,
        {
          headers: useAuth
            ? { authorization: `Bearer ${params.accessToken}` }
            : {},
          redirect: 'manual',
        },
        useAuth ? PPTX_PDF_METADATA_TIMEOUT_MS : PPTX_PDF_DOWNLOAD_TIMEOUT_MS,
        params.signal,
      );

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error('pptx render: redirect without location');
        }
        current = new URL(location, current).toString();
        // The pre-authed URL carries its own token in the query string; sending
        // ours to a foreign host would leak it.
        useAuth = false;
        continue;
      }
      if (!response.ok) {
        throw new Error(`pptx render: graph pdf upstream ${response.status}`);
      }

      const declared = Number(response.headers.get('content-length') ?? '0');
      if (declared > PPTX_PDF_MAX_BYTES) {
        throw new Error('pptx render: pdf too large');
      }
      return readCapped(response, PPTX_PDF_MAX_BYTES);
    }
    throw new Error('pptx render: too many redirects');
  }
}

/**
 * Read a response body into a Buffer, enforcing `maxBytes` INCREMENTALLY so an
 * over-large (or content-length-less) body can't be fully buffered into memory
 * before the cap is checked. Falls back to arrayBuffer() when the body isn't a
 * stream (still bounded by the post-hoc length check).
 */
async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new Error('pptx render: pdf too large');
    }
    return buffer;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error('pptx render: pdf too large');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function slideIndex(filename: string): number {
  const match = /(\d+)/.exec(filename);
  return match ? Number(match[1]) : 0;
}

function assertHttps(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('pptx render: invalid url');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('pptx render: refusing non-https url');
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = (): void => controller.abort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
