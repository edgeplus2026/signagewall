/**
 * Thin, delegated-auth client for the Power BI REST API. It is deliberately a
 * collection of pure functions over `fetch`: callers resolve/refresh the
 * per-instance Microsoft access token and this module never stores, returns or
 * logs it.
 *
 * All requests stay under `/v1.0/myorg`, so Microsoft—not a caller-supplied
 * tenant id—decides which tenant and resources the delegated user may see.
 */

const POWER_BI_API = 'https://api.powerbi.com/v1.0/myorg';
const WORKSPACE_PAGE_SIZE = 100;
const MAX_PAGES = 100;

/**
 * Minimal delegated permissions for the complete snapshot flow:
 *
 * - Workspace.Read.All: list workspaces available to the signed-in user;
 * - Report.Read.All: list reports/pages and create/read export jobs;
 * - Dataset.Read.All: required together with Report.Read.All by ExportToFile.
 *
 * Use the fully-qualified resource scopes because the existing Microsoft
 * connection also supports Microsoft Graph apps. A v2 token must have a single
 * resource audience; these names explicitly request a Power BI token.
 */
export const POWER_BI_PICKER_DELEGATED_SCOPES = [
  'https://analysis.windows.net/powerbi/api/Workspace.Read.All',
  'https://analysis.windows.net/powerbi/api/Report.Read.All',
] as const;

export const POWER_BI_SNAPSHOT_DELEGATED_SCOPES = [
  ...POWER_BI_PICKER_DELEGATED_SCOPES,
  'https://analysis.windows.net/powerbi/api/Dataset.Read.All',
] as const;

/** Token-free shape accepted by the CMS remote-select control. */
export interface PowerBiRemoteOption {
  id: string;
  title: string;
}

/** What the workspace response proves about snapshot-export capacity. */
export type PowerBiSnapshotCapacity =
  | 'capacity-detected'
  | 'unsupported-no-dedicated-capacity'
  | 'unknown';

/** Workspace picker option, including a non-secret machine-readable signal. */
export interface PowerBiWorkspaceOption extends PowerBiRemoteOption {
  snapshotCapacity: PowerBiSnapshotCapacity;
}

export type PowerBiApiErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'THROTTLED'
  | 'CAPACITY_REQUIRED'
  | 'INVALID_IDENTIFIER'
  | 'MALFORMED_RESPONSE'
  | 'UPSTREAM_ERROR';

/**
 * Stable, operator-actionable error. Messages never contain the response body,
 * request URL or bearer token. `retryAfterSeconds` comes only from the standard
 * response header and is safe to expose to the CMS.
 */
export class PowerBiApiError extends Error {
  readonly name = 'PowerBiApiError';

  constructor(
    readonly code: PowerBiApiErrorCode,
    message: string,
    readonly status?: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

interface PowerBiWorkspace {
  id: string;
  name: string;
  isOnDedicatedCapacity?: boolean;
}

interface PowerBiReport {
  id: string;
  name: string;
}

interface PowerBiPage {
  name: string;
  displayName: string;
  order?: number;
}

interface CollectionPage {
  value: unknown[];
  nextLink?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Power BI documents workspace/report ids as UUIDs. Rejecting anything else
 * prevents a nested picker from turning an id into a path or tenant selector.
 */
function powerBiId(value: string, kind: 'workspace' | 'report'): string {
  const trimmed = value.trim();
  if (!UUID_PATTERN.test(trimmed)) {
    throw new PowerBiApiError(
      'INVALID_IDENTIFIER',
      `The selected Power BI ${kind} is invalid. Pick it again.`,
    );
  }
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(
  value: unknown,
  resource: 'workspace' | 'report' | 'page',
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw malformed(`Power BI returned a ${resource} without an id or title.`);
  }
  return value;
}

function malformed(
  message = 'Power BI returned malformed data.',
): PowerBiApiError {
  return new PowerBiApiError('MALFORMED_RESPONSE', message);
}

function parseWorkspace(value: unknown): PowerBiWorkspace {
  if (!isRecord(value)) throw malformed();
  const capacity = value.isOnDedicatedCapacity;
  if (capacity !== undefined && typeof capacity !== 'boolean') {
    throw malformed('Power BI returned an invalid workspace capacity status.');
  }
  return {
    id: requiredString(value.id, 'workspace'),
    name: requiredString(value.name, 'workspace'),
    ...(capacity !== undefined ? { isOnDedicatedCapacity: capacity } : {}),
  };
}

function parseReport(value: unknown): PowerBiReport {
  if (!isRecord(value)) throw malformed();
  return {
    id: requiredString(value.id, 'report'),
    name: requiredString(value.name, 'report'),
  };
}

function parsePage(value: unknown): PowerBiPage {
  if (!isRecord(value)) throw malformed();
  const rawOrder = value.order;
  // Microsoft documents `order` as int32, but its own example serializes it as
  // a JSON string. Accept both representations while rejecting loose coercion.
  const order =
    typeof rawOrder === 'number' && Number.isInteger(rawOrder)
      ? rawOrder
      : typeof rawOrder === 'string' && /^\d+$/.test(rawOrder)
        ? Number(rawOrder)
        : undefined;
  if (rawOrder !== undefined && order === undefined) {
    throw malformed('Power BI returned an invalid report page order.');
  }
  return {
    name: requiredString(value.name, 'page'),
    displayName: requiredString(value.displayName, 'page'),
    ...(order !== undefined ? { order } : {}),
  };
}

function capacitySignal(workspace: PowerBiWorkspace): PowerBiSnapshotCapacity {
  if (workspace.isOnDedicatedCapacity === true) return 'capacity-detected';
  if (workspace.isOnDedicatedCapacity === false) {
    return 'unsupported-no-dedicated-capacity';
  }
  return 'unknown';
}

function capacityLabel(capacity: PowerBiSnapshotCapacity): string {
  switch (capacity) {
    case 'capacity-detected':
      // Dedicated capacity is necessary, but not sufficient: PPU can still be
      // unsupported and tenant export settings can disable the API.
      return 'dedicated capacity detected; export must be verified';
    case 'unsupported-no-dedicated-capacity':
      return 'snapshot unavailable: no dedicated capacity';
    default:
      return 'capacity status unknown; export must be verified';
  }
}

function matchesQuery(title: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return !normalized || title.toLowerCase().includes(normalized);
}

function safeRetryAfter(response: Response): number | undefined {
  const value = response.headers?.get('retry-after')?.trim();
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

/** Read only the documented error code/message to classify capacity failures. */
async function isCapacityFailure(response: Response): Promise<boolean> {
  if (![400, 403, 409, 422].includes(response.status)) return false;
  try {
    const body: unknown = await response.json();
    if (!isRecord(body) || !isRecord(body.error)) return false;
    const code = typeof body.error.code === 'string' ? body.error.code : '';
    const message =
      typeof body.error.message === 'string' ? body.error.message : '';
    return /capacity|premium|fabric|ppu|dedicated/i.test(`${code} ${message}`);
  } catch {
    return false;
  }
}

async function throwResponseError(response: Response): Promise<never> {
  // Detect this first because Power BI can report capacity restrictions as a
  // generic 400/403. Never include the inspected upstream fields in our error.
  if (await isCapacityFailure(response)) {
    throw new PowerBiApiError(
      'CAPACITY_REQUIRED',
      'Power BI snapshot export requires Premium, Embedded, or Fabric dedicated capacity; Premium Per User (PPU) is not supported.',
      response.status,
    );
  }

  switch (response.status) {
    case 401:
      throw new PowerBiApiError(
        'AUTHENTICATION_REQUIRED',
        'Power BI authorization expired or is invalid. Reconnect the Microsoft account.',
        401,
      );
    case 403:
      throw new PowerBiApiError(
        'PERMISSION_DENIED',
        'Power BI denied access. Grant admin consent for the required read-only scopes and confirm the connected user can access this workspace.',
        403,
      );
    case 404:
      throw new PowerBiApiError(
        'NOT_FOUND',
        'The Power BI workspace or report was not found, or the connected user no longer has access.',
        404,
      );
    case 429: {
      const retryAfterSeconds = safeRetryAfter(response);
      const suffix =
        retryAfterSeconds === undefined
          ? 'Try again shortly.'
          : `Try again in ${retryAfterSeconds} seconds.`;
      throw new PowerBiApiError(
        'THROTTLED',
        `Power BI is throttling requests. ${suffix}`,
        429,
        retryAfterSeconds,
      );
    }
    default:
      throw new PowerBiApiError(
        'UPSTREAM_ERROR',
        response.status >= 500
          ? 'Power BI is temporarily unavailable. Try again later.'
          : 'Power BI rejected the request. Verify the selected workspace and report.',
        response.status,
      );
  }
}

async function readCollectionPage(response: Response): Promise<CollectionPage> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw malformed();
  }
  if (!isRecord(body) || !Array.isArray(body.value)) throw malformed();

  const nextLink = body['@odata.nextLink'];
  if (nextLink !== undefined && typeof nextLink !== 'string') {
    throw malformed('Power BI returned an invalid pagination link.');
  }
  return {
    value: body.value,
    ...(typeof nextLink === 'string' && nextLink ? { nextLink } : {}),
  };
}

/**
 * Resolve a continuation only if it remains on the exact collection endpoint.
 * This prevents forwarding the delegated bearer token to a foreign host—or to
 * a different Power BI API—if an upstream/mocked response is malformed.
 */
function trustedContinuation(nextLink: string, collectionUrl: URL): string {
  let next: URL;
  try {
    next = new URL(nextLink, `${POWER_BI_API}/`);
  } catch {
    throw malformed('Power BI returned an invalid pagination link.');
  }

  if (
    next.protocol !== 'https:' ||
    next.origin !== new URL(POWER_BI_API).origin ||
    next.pathname !== collectionUrl.pathname ||
    next.username ||
    next.password
  ) {
    throw malformed('Power BI returned an unsafe pagination link.');
  }
  return next.toString();
}

interface CollectionOptions {
  /** Groups officially paginate with `$top`/`$skip` even without nextLink. */
  skipPageSize?: number;
}

async function getCollection(
  path: string,
  accessToken: string,
  signal?: AbortSignal,
  options: CollectionOptions = {},
): Promise<unknown[]> {
  const collectionUrl = new URL(`${POWER_BI_API}${path}`);
  const seen = new Set<string>();
  const values: unknown[] = [];
  let url: string | undefined = collectionUrl.toString();

  for (let pageNumber = 0; url && pageNumber < MAX_PAGES; pageNumber += 1) {
    if (seen.has(url)) throw malformed('Power BI pagination repeated a page.');
    seen.add(url);

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) await throwResponseError(response);

    const page = await readCollectionPage(response);
    values.push(...page.value);

    if (page.nextLink) {
      url = trustedContinuation(page.nextLink, collectionUrl);
    } else if (
      options.skipPageSize !== undefined &&
      page.value.length === options.skipPageSize
    ) {
      const next = new URL(collectionUrl);
      const currentSkip = Number(new URL(url).searchParams.get('$skip') ?? 0);
      next.searchParams.set(
        '$skip',
        String(currentSkip + options.skipPageSize),
      );
      url = next.toString();
    } else {
      url = undefined;
    }
  }

  if (url) throw malformed('Power BI returned too many result pages.');
  return values;
}

function dedupe<T extends PowerBiRemoteOption>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
}

/**
 * List only workspaces Microsoft says this delegated user can access. A
 * non-capacity workspace stays visible so the operator understands why it
 * cannot be selected for snapshot export; it is never presented as ready.
 */
export async function listPowerBiWorkspaces(
  accessToken: string,
  query = '',
  signal?: AbortSignal,
): Promise<PowerBiWorkspaceOption[]> {
  const values = await getCollection(
    `/groups?$top=${WORKSPACE_PAGE_SIZE}`,
    accessToken,
    signal,
    { skipPageSize: WORKSPACE_PAGE_SIZE },
  );

  const options = values
    .map(parseWorkspace)
    .filter((workspace) => matchesQuery(workspace.name, query))
    .map((workspace) => {
      const snapshotCapacity = capacitySignal(workspace);
      return {
        id: workspace.id,
        title: `${workspace.name} — ${capacityLabel(snapshotCapacity)}`,
        snapshotCapacity,
      } satisfies PowerBiWorkspaceOption;
    });

  const rank: Record<PowerBiSnapshotCapacity, number> = {
    'capacity-detected': 0,
    unknown: 1,
    'unsupported-no-dedicated-capacity': 2,
  };
  return dedupe(options).sort(
    (a, b) =>
      rank[a.snapshotCapacity] - rank[b.snapshotCapacity] ||
      a.title.localeCompare(b.title),
  );
}

/** List reports visible to the delegated user inside one selected workspace. */
export async function listPowerBiReports(
  accessToken: string,
  workspaceId: string,
  query = '',
  signal?: AbortSignal,
): Promise<PowerBiRemoteOption[]> {
  const workspace = powerBiId(workspaceId, 'workspace');
  const values = await getCollection(
    `/groups/${encodeURIComponent(workspace)}/reports`,
    accessToken,
    signal,
  );
  return dedupe(
    values.map(parseReport).map((report) => ({
      id: report.id,
      title: report.name,
    })),
  )
    .filter((option) => matchesQuery(option.title, query))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** List pages in report display order for the selected workspace/report pair. */
export async function listPowerBiReportPages(
  accessToken: string,
  workspaceId: string,
  reportId: string,
  query = '',
  signal?: AbortSignal,
): Promise<PowerBiRemoteOption[]> {
  const workspace = powerBiId(workspaceId, 'workspace');
  const report = powerBiId(reportId, 'report');
  const values = await getCollection(
    `/groups/${encodeURIComponent(workspace)}/reports/${encodeURIComponent(report)}/pages`,
    accessToken,
    signal,
  );
  return dedupe(
    values
      .map(parsePage)
      .sort(
        (a, b) =>
          (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER),
      )
      .map((page) => ({ id: page.name, title: page.displayName })),
  ).filter((option) => matchesQuery(option.title, query));
}
