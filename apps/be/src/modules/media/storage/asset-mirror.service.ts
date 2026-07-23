import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import sharp from 'sharp';

import {
  ASSET_MIRROR_CONCURRENCY,
  ASSET_MIRROR_MAX_BYTES,
  ASSET_MIRROR_MAX_WIDTH,
  ASSET_MIRROR_TIMEOUT_MS,
  ASSET_MIRROR_WEBP_QUALITY,
} from '../media.constants';
import {
  AssetMirror,
  setAssetMirror,
} from '../../apps/connectors/_shared/asset-mirror.registry';
import { R2StorageService } from './r2-storage.service';

/**
 * Re-hosts provider images as permanent WebP objects in R2 on behalf of the
 * plain-object connectors, which have no DI of their own (see
 * asset-mirror.registry.ts for why this indirection exists).
 *
 * The images it fetches are UNAUTHENTICATED by the time we see them — a Google
 * Slides thumbnail `contentUrl` is a pre-signed googleusercontent link — so no
 * bearer token is ever sent here. What it does enforce is https, a per-image
 * byte cap read incrementally, and a per-image timeout, because the URL came
 * from a third party's JSON and nothing else downstream bounds it.
 */
@Injectable()
export class AssetMirrorService implements OnModuleInit, AssetMirror {
  private readonly logger = new Logger(AssetMirrorService.name);

  constructor(private readonly r2: R2StorageService) {}

  onModuleInit(): void {
    setAssetMirror(this);
  }

  isConfigured(): boolean {
    return this.r2.isConfigured();
  }

  publicUrl(key: string): string | undefined {
    return this.r2.getPublicUrl(key);
  }

  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.r2.deleteObjects(keys);
  }

  async mirrorImages(params: {
    urls: string[];
    keyPrefix: string;
    signal?: AbortSignal;
  }): Promise<string[]> {
    if (!this.r2.isConfigured()) {
      throw new Error('asset mirror: R2 storage is not configured');
    }
    const { urls, keyPrefix, signal } = params;

    // Results are placed BY INDEX, never pushed: the workers finish out of
    // order and the caller's slide order is the whole point.
    const keys = new Array<string>(urls.length);
    let next = 0;

    const worker = async (): Promise<void> => {
      for (;;) {
        const index = next++;
        if (index >= urls.length) return;
        const key = `${keyPrefix}/${String(index).padStart(3, '0')}.webp`;
        const source = urls[index];
        if (!source) {
          throw new Error(
            `asset mirror: missing url at index ${String(index)}`,
          );
        }
        const image = await this.fetchImage(source, signal);
        const webp = await sharp(image)
          .rotate()
          .resize({ width: ASSET_MIRROR_MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: ASSET_MIRROR_WEBP_QUALITY })
          .toBuffer();
        await this.r2.uploadObject(key, webp, 'image/webp');
        keys[index] = key;
      }
    };

    const lanes = Math.min(ASSET_MIRROR_CONCURRENCY, urls.length);
    await Promise.all(Array.from({ length: lanes }, () => worker()));

    this.logger.debug(`Mirrored ${String(urls.length)} images to ${keyPrefix}`);
    return keys;
  }

  /** Download one image, enforcing https, a timeout and an incremental cap. */
  private async fetchImage(url: string, signal?: AbortSignal): Promise<Buffer> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('asset mirror: invalid url');
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('asset mirror: refusing non-https url');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ASSET_MIRROR_TIMEOUT_MS);
    const onAbort = (): void => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`asset mirror: upstream ${String(response.status)}`);
      }
      const declared = Number(response.headers.get('content-length') ?? '0');
      if (declared > ASSET_MIRROR_MAX_BYTES) {
        throw new Error('asset mirror: image too large');
      }
      return await readCapped(response, ASSET_MIRROR_MAX_BYTES);
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }
}

/**
 * Read a response body into a Buffer, enforcing `maxBytes` INCREMENTALLY so an
 * over-large (or content-length-less) body can't be fully buffered into memory
 * before the cap is checked.
 */
async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new Error('asset mirror: image too large');
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
      throw new Error('asset mirror: image too large');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
