/**
 * Thin client for the Canva Connect REST API, shared by the connections browse
 * endpoint (search designs as the operator types) and the `canva` connector
 * (detect the design's export formats and export it to mp4/jpg/png). Pure
 * functions over `fetch` — the caller supplies an already-resolved (refreshed)
 * access token; nothing here touches encryption or the DB.
 */

const API_BASE = 'https://api.canva.com/rest/v1';

/** A design as surfaced to the CMS picker (token-free). */
export interface CanvaDesignSummary {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

interface CanvaDesignItem {
  id: string;
  title?: string;
  thumbnail?: { url?: string };
}

async function canvaGet(
  path: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`canva upstream ${response.status}`);
  }
  return response.json();
}

/**
 * Search the user's designs (and designs shared with them). `query` is Canva's
 * server-side search term; an empty query returns the most relevant/recent. The
 * result is capped at `limit` (Canva allows 1–100).
 */
export async function searchCanvaDesigns(
  accessToken: string,
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<CanvaDesignSummary[]> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 25),
  });
  const trimmed = query.trim();
  if (trimmed) {
    params.set('query', trimmed.slice(0, 255));
  }
  const body = (await canvaGet(
    `/designs?${params.toString()}`,
    accessToken,
    options.signal,
  )) as { items?: CanvaDesignItem[] };

  return (body.items ?? []).map((item) => ({
    id: item.id,
    title: item.title ?? 'Untitled design',
    ...(item.thumbnail?.url ? { thumbnailUrl: item.thumbnail.url } : {}),
  }));
}

/** A design's metadata: change-detection signature + export sizing hints. */
export interface CanvaDesignMeta {
  title: string;
  /** Unix seconds of last modification, when Canva reports it. */
  updatedAt?: number;
  /** Number of pages in the design (>= 1). */
  pageCount?: number;
  /** Thumbnail dimensions, used to derive portrait/landscape orientation. */
  thumbWidth?: number;
  thumbHeight?: number;
}

/** Fetch a single design's metadata (title, updated_at, page count, thumb size). */
export async function getCanvaDesign(
  accessToken: string,
  designId: string,
  signal?: AbortSignal,
): Promise<CanvaDesignMeta> {
  const body = (await canvaGet(
    `/designs/${encodeURIComponent(designId)}`,
    accessToken,
    signal,
  )) as {
    design?: {
      title?: string;
      updated_at?: number;
      page_count?: number;
      thumbnail?: { width?: number; height?: number };
    };
  };
  const design = body.design ?? {};
  return {
    title: design.title ?? 'Canva design',
    ...(typeof design.updated_at === 'number'
      ? { updatedAt: design.updated_at }
      : {}),
    ...(typeof design.page_count === 'number'
      ? { pageCount: design.page_count }
      : {}),
    ...(typeof design.thumbnail?.width === 'number'
      ? { thumbWidth: design.thumbnail.width }
      : {}),
    ...(typeof design.thumbnail?.height === 'number'
      ? { thumbHeight: design.thumbnail.height }
      : {}),
  };
}

/**
 * Which export formats THIS design supports (from GET designs/{id}/export-formats).
 * Returns the set of format keys (e.g. 'mp4', 'jpg', 'png', 'pdf'). The connector
 * picks the best supported one (mp4 > jpg > png). Returns an empty set on failure
 * so the caller can fall back to a safe default.
 */
export async function getDesignExportFormats(
  accessToken: string,
  designId: string,
  signal?: AbortSignal,
): Promise<Set<string>> {
  const body = (await canvaGet(
    `/designs/${encodeURIComponent(designId)}/export-formats`,
    accessToken,
    signal,
  )) as { formats?: Record<string, unknown> };
  return new Set(Object.keys(body.formats ?? {}));
}

/** The export formats the connector supports, in priority order (best first). */
export type CanvaExportFormat = 'mp4' | 'jpg' | 'png';

/** Orientation drives the export quality/size (landscape vs portrait). */
export type CanvaOrientation = 'horizontal' | 'vertical';

/**
 * The Canva export `format` payload for a chosen format + orientation. mp4 needs
 * an orientation-specific quality; jpg/png take a quality + a width sized to the
 * orientation. (Mirrors the priorities the Castit integration settled on.)
 */
function buildFormatOptions(
  format: CanvaExportFormat,
  orientation: CanvaOrientation,
): Record<string, unknown> {
  switch (format) {
    case 'mp4':
      return { type: 'mp4', quality: `${orientation}_1080p` };
    case 'jpg':
      return {
        type: 'jpg',
        quality: 100,
        width: orientation === 'horizontal' ? 2560 : 1440,
      };
    default:
      return {
        type: 'png',
        width: orientation === 'horizontal' ? 2560 : 1440,
      };
  }
}

/** Status of an export job, plus the page URLs once it succeeds. */
export interface CanvaExportJob {
  status: 'in_progress' | 'success' | 'failed';
  /** One mp4 (video) or one image per page (jpg/png), in page order. */
  urls: string[];
}

/**
 * Create an async export job for a design in the given format/orientation and
 * return the job id. Canva exports run server-side (video can take minutes), so
 * the caller creates the job here and polls {@link getExportJob} across refreshes
 * instead of blocking a single request.
 */
export async function createExportJob(
  accessToken: string,
  designId: string,
  format: CanvaExportFormat,
  orientation: CanvaOrientation,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${API_BASE}/exports`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      design_id: designId,
      format: buildFormatOptions(format, orientation),
    }),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`canva export create ${response.status}`);
  }
  const created = (await response.json()) as { job?: { id?: string } };
  const jobId = created.job?.id;
  if (!jobId) {
    throw new Error('canva: export job has no id');
  }
  return jobId;
}

/** Hard cap on returned page URLs so a huge design can't bloat the payload. */
const MAX_EXPORT_URLS = 50;

/** Fetch the current status of an export job (and its URLs when done). */
export async function getExportJob(
  accessToken: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<CanvaExportJob> {
  const body = (await canvaGet(
    `/exports/${encodeURIComponent(jobId)}`,
    accessToken,
    signal,
  )) as { job?: { status?: string; urls?: string[] } };
  const status = body.job?.status;
  if (status === 'success') {
    const urls = body.job?.urls ?? [];
    if (urls.length === 0) {
      throw new Error('canva: export succeeded with no urls');
    }
    return { status: 'success', urls: urls.slice(0, MAX_EXPORT_URLS) };
  }
  if (status === 'failed') {
    return { status: 'failed', urls: [] };
  }
  return { status: 'in_progress', urls: [] };
}

/**
 * Poll an export job for a short budget (catches fast exports so short designs
 * finish within the create call). Returns as soon as the job settles, or with
 * `in_progress` when the budget elapses — the caller then persists the job id and
 * re-checks on the next tick.
 */
export async function pollExportJobBriefly(
  accessToken: string,
  jobId: string,
  options: { budgetMs?: number; signal?: AbortSignal } = {},
): Promise<CanvaExportJob> {
  const deadline = Date.now() + (options.budgetMs ?? 6000);
  let job = await getExportJob(accessToken, jobId, options.signal);
  while (job.status === 'in_progress' && Date.now() < deadline) {
    await delay(1000, options.signal);
    job = await getExportJob(accessToken, jobId, options.signal);
  }
  return job;
}

/** Promise-based delay that rejects if the abort signal fires. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
