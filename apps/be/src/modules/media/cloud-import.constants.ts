import { MediaItemSource } from './schemas/media-item.schema';
import { CloudImportProvider } from './dto/import-cloud-media.dto';

/**
 * How many provider downloads run at once. Mirrors the frontend's
 * `MEDIA_MAX_CONCURRENT_UPLOADS` so a single import batch can't open an
 * unbounded number of outbound connections (or buffer that many assets in
 * memory) at the same time.
 */
export const CLOUD_IMPORT_CONCURRENCY = 4;

/** Timeout for the small Microsoft Graph metadata lookup (no bytes). */
export const CLOUD_IMPORT_METADATA_TIMEOUT_MS = 15_000;

/** Timeout for the actual asset download (videos can be tens of MB). */
export const CLOUD_IMPORT_DOWNLOAD_TIMEOUT_MS = 60_000;

/** Maximum number of redirects we will follow during a download. */
export const CLOUD_IMPORT_MAX_REDIRECTS = 3;

/**
 * Per-provider host allowlist. The `url`/`msgraph` strategies fetch URLs that
 * originate from the client, so without this a malicious caller could point us
 * at internal services (SSRF). A URL is only fetched when its host matches one
 * of these entries. Entries beginning with `.` match the apex and any subdomain
 * (suffix match); other entries must match the host exactly.
 */
export const HOST_ALLOWLIST: Record<CloudImportProvider, readonly string[]> = {
  [CloudImportProvider.DROPBOX]: ['.dropboxusercontent.com'],
  [CloudImportProvider.GOOGLE_PHOTOS]: ['.googleusercontent.com'],
  // Drive builds its own www.googleapis.com URL; listed for completeness.
  [CloudImportProvider.GOOGLE_DRIVE]: ['www.googleapis.com'],
  [CloudImportProvider.ONEDRIVE]: [
    'graph.microsoft.com',
    '.sharepoint.com',
    '.svc.ms',
    '.1drv.com',
  ],
  [CloudImportProvider.SHAREPOINT]: [
    'graph.microsoft.com',
    '.sharepoint.com',
    '.svc.ms',
  ],
};

/** Maps a picked-from provider to the persisted media source. */
export const PROVIDER_TO_SOURCE: Record<CloudImportProvider, MediaItemSource> =
  {
    [CloudImportProvider.GOOGLE_DRIVE]: MediaItemSource.GOOGLE_DRIVE,
    [CloudImportProvider.GOOGLE_PHOTOS]: MediaItemSource.GOOGLE_PHOTOS,
    [CloudImportProvider.ONEDRIVE]: MediaItemSource.ONEDRIVE,
    [CloudImportProvider.SHAREPOINT]: MediaItemSource.SHAREPOINT,
    [CloudImportProvider.DROPBOX]: MediaItemSource.DROPBOX,
  };

/** Stable, machine-readable reason a single item failed to import. */
export type CloudImportErrorCode =
  | 'forbidden_host'
  | 'download_failed'
  | 'invalid_file_type'
  | 'file_too_large'
  | 'import_failed';

/** Per-item failure carrying a stable code (never aborts the whole batch). */
export class CloudImportError extends Error {
  constructor(readonly code: CloudImportErrorCode) {
    super(code);
    this.name = 'CloudImportError';
  }
}

/**
 * Host allowlist check. Exact match, or — for entries starting with `.` — the
 * apex (`example.com`) and any subdomain (`*.example.com`). Never a substring
 * match, so `evil.com/?x=dropboxusercontent.com` is rejected.
 */
export function isHostAllowed(
  hostname: string,
  allowed: readonly string[],
): boolean {
  const host = hostname.toLowerCase();
  return allowed.some((entry) =>
    entry.startsWith('.')
      ? host === entry.slice(1) || host.endsWith(entry)
      : host === entry,
  );
}

/**
 * Runs `task` over `items` with at most `limit` in flight, preserving input
 * order in the result. A tiny local helper to avoid adding a dependency.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index], index);
    }
  };

  const workers = Array.from(
    { length: Math.min(Math.max(limit, 1), items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
