import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import { ConnectorError } from '@signagewall/apps-contract';
import type { CanvaPayload } from '@signagewall/apps';

import {
  type CanvaExportFormat,
  type CanvaExportJob,
  type CanvaOrientation,
  createExportJob,
  getCanvaDesign,
  getDesignExportFormats,
  getExportJob,
  pollExportJobBriefly,
} from '../../connections/providers/canva-api';

/** Export format priority: video first, then high-quality images. */
const FORMAT_PRIORITY: CanvaExportFormat[] = ['mp4', 'jpg', 'png'];

interface CanvaConfig {
  connectionId?: string;
  /** The chosen design: { id, label } from the `remote-select` picker. */
  design?: { id?: string; label?: string };
}

/** Persisted (server-only) state for an in-flight export job (via `secrets`). */
interface CanvaJobState {
  id: string;
  format: CanvaExportFormat;
  designId: string;
  updatedAt?: number;
}

/**
 * The last export that SUCCEEDED, kept so an unchanged design is not exported
 * again (see the reuse branch in `fetchData`). Server-only, via `secrets`.
 */
interface CanvaExportState {
  designId: string;
  format: CanvaExportFormat;
  /** The design's `updated_at` at export time — the whole change signal. */
  updatedAt: number;
  kind: 'video' | 'slideshow';
  /** The export URLs handed to the player. */
  urls: string[];
  /** Epoch ms the signed URLs stop working; from the signature itself. */
  expiresAt: number;
  /** When this export was made, so a reuse does not re-stamp the payload. */
  fetchedAt: string;
}

/**
 * Re-export once the URLs are within this of expiring.
 *
 * Canva hands back presigned URLs rather than permanent ones, and the signature
 * is what dies — not the design. Measured on live exports: 4.7 h, 4.9 h and
 * 10.7 h, so the lifetime is neither fixed nor documented reliably (the payload
 * doc used to claim a flat 24 h). Reading it out of the signature is the only
 * honest source. An hour of margin is many poll cycles at any sane cadence.
 */
const RENEW_BEFORE_MS = 60 * 60 * 1000;

/**
 * When a presigned URL stops working, read from its own signature.
 *
 * `X-Amz-Date` is ISO 8601 BASIC (`20260818T173757Z`), which `Date` will not
 * parse — hence the explicit split. Undefined means "cannot tell", and every
 * caller treats that as expired: re-exporting a still-good design costs one job,
 * while trusting an unreadable signature puts a dead URL on the wall.
 */
function signedUrlExpiry(url: string): number | undefined {
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return undefined;
  }
  const date = params.get('X-Amz-Date');
  const seconds = Number(params.get('X-Amz-Expires'));
  const parts = date
    ? /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(date)
    : null;
  if (!parts || !Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  const signedAt = Date.UTC(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3]),
    Number(parts[4]),
    Number(parts[5]),
    Number(parts[6]),
  );
  return signedAt + seconds * 1000;
}

/** The first of a set of URLs to die — a slideshow is only as good as its worst. */
function earliestExpiry(urls: string[]): number | undefined {
  let earliest: number | undefined;
  for (const url of urls) {
    const expiry = signedUrlExpiry(url);
    // One unreadable signature makes the whole set untrustworthy.
    if (expiry === undefined) return undefined;
    earliest = earliest === undefined ? expiry : Math.min(earliest, expiry);
  }
  return earliest;
}

/** Read the previous successful export from `secrets`, if any and still valid. */
function readExport(
  secrets: Record<string, unknown> | undefined,
): CanvaExportState | undefined {
  const state = secrets?.export as Partial<CanvaExportState> | undefined;
  if (
    !state ||
    typeof state.designId !== 'string' ||
    typeof state.format !== 'string' ||
    typeof state.updatedAt !== 'number' ||
    typeof state.expiresAt !== 'number' ||
    typeof state.fetchedAt !== 'string' ||
    !Array.isArray(state.urls) ||
    state.urls.length === 0
  ) {
    return undefined;
  }
  return state as CanvaExportState;
}

/** Read the persisted job from the previous fetch's `secrets`, if any/valid. */
function readJob(
  secrets: Record<string, unknown> | undefined,
): CanvaJobState | undefined {
  const job = secrets?.job as Partial<CanvaJobState> | undefined;
  if (job && typeof job.id === 'string' && typeof job.format === 'string') {
    return job as CanvaJobState;
  }
  return undefined;
}

/** Build the final player payload from a succeeded export job. */
function buildResult(
  designId: string,
  name: string,
  format: CanvaExportFormat,
  job: CanvaExportJob,
  updatedAt?: number,
): ConnectorResult<CanvaPayload> {
  const kind = format === 'mp4' ? 'video' : 'slideshow';
  const fetchedAt = new Date().toISOString();
  const expiresAt = earliestExpiry(job.urls);
  return {
    playerPayload: { designId, name, kind, slides: job.urls, fetchedAt },
    // Replaces the in-flight job with what was exported, so the next fetch can
    // see this design has not moved and skip re-exporting it. Only worth keeping
    // when both halves of that test are readable — the design revision, and how
    // long these URLs have left. Without either, `secrets` is cleared and the
    // next fetch exports again, which is the old behaviour and always correct.
    ...(updatedAt !== undefined && expiresAt !== undefined
      ? {
          secrets: {
            export: {
              designId,
              format,
              updatedAt,
              kind,
              urls: job.urls,
              expiresAt,
              fetchedAt,
            } satisfies CanvaExportState,
          },
        }
      : {}),
    ...(updatedAt !== undefined ? { version: `${updatedAt}:${format}` } : {}),
  };
}

/** Hand back the previous export untouched — no job, no re-render, no new URLs. */
function reuseExport(
  state: CanvaExportState,
  name: string,
): ConnectorResult<CanvaPayload> {
  return {
    playerPayload: {
      designId: state.designId,
      name,
      kind: state.kind,
      slides: state.urls,
      // Deliberately the ORIGINAL instant, not now: this export really was made
      // then, and re-stamping it would claim work that did not happen.
      fetchedAt: state.fetchedAt,
    },
    secrets: { export: state },
    version: `${state.updatedAt}:${state.format}`,
  };
}

/**
 * Canva connector (`connected`). The operator connects a Canva account (OAuth +
 * PKCE) and picks a design; this connector asks Canva which export formats the
 * design supports, picks the best (mp4 for presentations/animations, else
 * jpg/png), and exports it — a single mp4, or one image per page for a slideshow.
 *
 * Exports run ASYNCHRONOUSLY: video rendering can take minutes, so the connector
 * is a state machine. On the first fetch it creates an export job (and briefly
 * polls to catch fast exports); if it isn't done it persists the job id in
 * `secrets` and returns `pending`. Subsequent fetches (scheduler tick / preview
 * poll) check the job and, when it succeeds, return the final payload. This lets
 * even long videos finish without blocking a single request.
 *
 * Per-connection cache key (a design is private). Change-detection keys on the
 * design's `updated_at` + chosen format (the `version`).
 */
export const canvaConnector: AppConnector<CanvaConfig, CanvaPayload> = {
  oauth: {
    provider: 'canva',
    authorizationUrl: 'https://www.canva.com/api/oauth/authorize',
    tokenUrl: 'https://api.canva.com/rest/v1/oauth/token',
    scopes: ['design:meta:read', 'design:content:read', 'profile:read'],
  },

  // We no longer block for the whole export (async job); a create + brief poll,
  // or a single status check, fits comfortably here.
  timeoutMs: 20_000,

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    const designId = (config.design?.id ?? '').trim() || 'none';
    return `canva:${connectionId}:${designId}`;
  },

  async fetchData(
    config: CanvaConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<CanvaPayload>> {
    if (!ctx.connection) {
      throw new Error('canva: no connection resolved');
    }
    const designId = (config.design?.id ?? '').trim();
    if (!designId) {
      throw new ConnectorError('config_invalid', 'canva: missing design id');
    }
    const accessToken = ctx.connection.accessToken;
    const name = config.design?.label ?? 'Canva design';

    // Resume an in-flight export job for THIS design (created on a prior fetch).
    const job = readJob(ctx.secrets);
    if (job && job.designId === designId) {
      const status = await getExportJob(accessToken, job.id, ctx.signal);
      if (status.status === 'in_progress') {
        // Still rendering — keep the job and let the host preserve last-known.
        ctx.logger.debug('canva export pending', { designId, jobId: job.id });
        return { pending: true, secrets: { job } };
      }
      if (status.status === 'failed') {
        throw new Error('canva: export job failed');
      }
      return buildResult(designId, name, job.format, status, job.updatedAt);
    }

    // One cheap metadata read (100/min per user), needed on every path: it
    // carries both the design's revision and its shape.
    const meta = await getCanvaDesign(accessToken, designId, ctx.signal);

    // Nothing has changed and the URLs still have hours left — hand back what we
    // exported last time.
    //
    // This branch is the whole point of the state above. Without it every single
    // poll created an export job for a design nobody had touched, which for the
    // mp4 designs this app prefers means Canva RE-RENDERED A VIDEO on a timer,
    // for as long as the instance existed. It also spent the scarcest quota in
    // the API — export creation is 20/min per user against 100/min for this read
    // — on work whose output was then discarded by change-detection anyway.
    //
    // Both conditions have to hold. The revision proves the design is the same
    // artwork; the expiry proves the URLs still resolve. A signed URL dies on its
    // own schedule while the design sits perfectly still, so revision alone would
    // eventually put a dead link on a screen.
    const previous = readExport(ctx.secrets);
    if (
      previous &&
      previous.designId === designId &&
      meta.updatedAt !== undefined &&
      previous.updatedAt === meta.updatedAt &&
      previous.expiresAt - Date.now() > RENEW_BEFORE_MS
    ) {
      ctx.logger.debug('canva reuse', {
        designId,
        expiresIn: previous.expiresAt - Date.now(),
      });
      return reuseExport(previous, name);
    }

    // Changed, expiring, or nothing to reuse: pick the format and export.
    let available: Set<string>;
    try {
      available = await getDesignExportFormats(
        accessToken,
        designId,
        ctx.signal,
      );
    } catch {
      available = new Set();
    }
    const format: CanvaExportFormat =
      FORMAT_PRIORITY.find((candidate) => available.has(candidate)) ?? 'jpg';
    const orientation: CanvaOrientation =
      meta.thumbWidth && meta.thumbHeight && meta.thumbHeight > meta.thumbWidth
        ? 'vertical'
        : 'horizontal';

    const jobId = await createExportJob(
      accessToken,
      designId,
      format,
      orientation,
      ctx.signal,
    );
    // The job now exists; persist it so it's never lost, then briefly poll so
    // fast (image / short) exports finish inline.
    const nextJob: CanvaJobState = {
      id: jobId,
      format,
      designId,
      ...(meta.updatedAt !== undefined ? { updatedAt: meta.updatedAt } : {}),
    };
    const deferred: ConnectorResult<CanvaPayload> = {
      pending: true,
      secrets: { job: nextJob },
    };

    let status;
    try {
      status = await pollExportJobBriefly(accessToken, jobId, {
        ...(ctx.signal ? { signal: ctx.signal } : {}),
      });
    } catch {
      // A transient error (or the fetch budget aborting) during the brief poll
      // must NOT discard the just-created export — resume it on the next tick.
      ctx.logger.debug('canva export deferred', { designId, jobId, format });
      return deferred;
    }

    if (status.status === 'failed') {
      throw new Error('canva: export job failed');
    }
    if (status.status === 'in_progress') {
      ctx.logger.debug('canva export started', { designId, jobId, format });
      return deferred;
    }
    return buildResult(designId, name, format, status, meta.updatedAt);
  },
};
