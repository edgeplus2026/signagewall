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
  return {
    playerPayload: {
      designId,
      name,
      kind: format === 'mp4' ? 'video' : 'slideshow',
      slides: job.urls,
      fetchedAt: new Date().toISOString(),
    },
    // A final result clears the in-flight job (secrets omitted → cleared).
    ...(updatedAt !== undefined ? { version: `${updatedAt}:${format}` } : {}),
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

    // No (matching) job yet: pick the format and create a fresh export job.
    const meta = await getCanvaDesign(accessToken, designId, ctx.signal);
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
