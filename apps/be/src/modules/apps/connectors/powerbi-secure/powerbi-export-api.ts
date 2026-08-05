import { PowerBiApiError } from '../../../connections/providers/powerbi-api';

const POWER_BI_API = 'https://api.powerbi.com/v1.0/myorg';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
}

export type PowerBiExportStatus =
  | 'not-started'
  | 'running'
  | 'succeeded'
  | 'failed';

export interface PowerBiExportJobStatus {
  id: string;
  status: PowerBiExportStatus;
  percentComplete?: number;
  expirationTime?: string;
}

export interface StartPowerBiExportInput {
  accessToken: string;
  workspaceId: string;
  reportId: string;
  pageName?: string;
  signal?: AbortSignal;
}

export interface PollPowerBiExportInput {
  accessToken: string;
  workspaceId: string;
  reportId: string;
  exportId: string;
  signal?: AbortSignal;
}

export interface DownloadPowerBiExportInput extends PollPowerBiExportInput {
  maxBytes: number;
}

export interface PowerBiExportApi {
  start(input: StartPowerBiExportInput): Promise<PowerBiExportJobStatus>;
  poll(input: PollPowerBiExportInput): Promise<PowerBiExportJobStatus>;
  download(input: DownloadPowerBiExportInput): Promise<Buffer>;
}

function identifier(value: string, label: string): string {
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw new PowerBiApiError(
      'INVALID_IDENTIFIER',
      `The selected Power BI ${label} is invalid. Pick it again.`,
    );
  }
  return normalized;
}

function reportPath(input: { workspaceId: string; reportId: string }): string {
  const workspaceId = identifier(input.workspaceId, 'workspace');
  const reportId = identifier(input.reportId, 'report');
  return `/groups/${encodeURIComponent(workspaceId)}/reports/${encodeURIComponent(reportId)}`;
}

/** Microsoft export ids are opaque (and may include `=`), not UUIDs. */
function opaqueExportId(value: string): string {
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > 512 ||
    hasControlCharacters(normalized) ||
    /[/\\?#]/.test(normalized)
  ) {
    throw new PowerBiApiError(
      'INVALID_IDENTIFIER',
      'The Power BI export job identifier is invalid.',
    );
  }
  return normalized;
}

function safePageName(value: string | undefined): string | undefined {
  const page = value?.trim();
  if (!page) return undefined;
  if (page.length > 256 || hasControlCharacters(page)) {
    throw new PowerBiApiError(
      'INVALID_IDENTIFIER',
      'The selected Power BI page is invalid. Pick it again.',
    );
  }
  return page;
}

function retryAfter(response: Response): number | undefined {
  const value = response.headers.get('retry-after')?.trim();
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  return Number.isNaN(date)
    ? undefined
    : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

async function classifyFailure(response: Response): Promise<never> {
  let capacityFailure = false;
  if ([400, 403, 409, 422].includes(response.status)) {
    try {
      const body: unknown = await response.clone().json();
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const error = (body as Record<string, unknown>).error;
        if (error && typeof error === 'object' && !Array.isArray(error)) {
          const value = error as Record<string, unknown>;
          const code = typeof value.code === 'string' ? value.code : '';
          const message =
            typeof value.message === 'string' ? value.message : '';
          capacityFailure = /capacity|premium|fabric|ppu|dedicated/i.test(
            `${code} ${message}`,
          );
        }
      }
    } catch {
      // Response bodies are deliberately not propagated or logged.
    }
  }

  if (capacityFailure) {
    throw new PowerBiApiError(
      'CAPACITY_REQUIRED',
      'Power BI snapshot export requires Premium, Embedded, or Fabric dedicated capacity; Premium Per User (PPU) is not supported.',
      response.status,
    );
  }
  if (response.status === 401) {
    throw new PowerBiApiError(
      'AUTHENTICATION_REQUIRED',
      'Power BI authorization expired. Reconnect the Microsoft account.',
      401,
    );
  }
  if (response.status === 403) {
    throw new PowerBiApiError(
      'PERMISSION_DENIED',
      'Power BI denied the export. Confirm read permissions, tenant export settings, report support, and capacity.',
      403,
    );
  }
  if (response.status === 404) {
    throw new PowerBiApiError(
      'NOT_FOUND',
      'The Power BI report or export job was not found, or access was removed.',
      404,
    );
  }
  if (response.status === 429) {
    const wait = retryAfter(response);
    throw new PowerBiApiError(
      'THROTTLED',
      wait === undefined
        ? 'Power BI is throttling snapshot export. Try again shortly.'
        : `Power BI is throttling snapshot export. Try again in ${wait} seconds.`,
      429,
      wait,
    );
  }
  throw new PowerBiApiError(
    'UPSTREAM_ERROR',
    response.status >= 500
      ? 'Power BI export is temporarily unavailable. Try again later.'
      : 'Power BI rejected the export. The report may contain an unsupported visual or sensitivity-label combination.',
    response.status,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readStatus(response: Response): Promise<PowerBiExportJobStatus> {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new PowerBiApiError(
      'MALFORMED_RESPONSE',
      'Power BI returned malformed export status data.',
    );
  }
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) {
    throw new PowerBiApiError(
      'MALFORMED_RESPONSE',
      'Power BI returned malformed export status data.',
    );
  }
  const exportId = opaqueExportId(value.id);

  const rawStatus = typeof value.status === 'string' ? value.status : '';
  const statusByMicrosoftValue: Record<string, PowerBiExportStatus> = {
    NotStarted: 'not-started',
    Running: 'running',
    Succeeded: 'succeeded',
    Failed: 'failed',
  };
  const status = statusByMicrosoftValue[rawStatus];
  if (!status) {
    throw new PowerBiApiError(
      'MALFORMED_RESPONSE',
      'Power BI returned an unknown export status.',
    );
  }

  const percent = value.percentComplete;
  if (
    percent !== undefined &&
    (typeof percent !== 'number' ||
      !Number.isFinite(percent) ||
      percent < 0 ||
      percent > 100)
  ) {
    throw new PowerBiApiError(
      'MALFORMED_RESPONSE',
      'Power BI returned invalid export progress data.',
    );
  }
  const expiration = value.expirationTime;
  if (expiration !== undefined && typeof expiration !== 'string') {
    throw new PowerBiApiError(
      'MALFORMED_RESPONSE',
      'Power BI returned an invalid export expiration time.',
    );
  }

  return {
    id: exportId,
    status,
    ...(typeof percent === 'number' ? { percentComplete: percent } : {}),
    ...(typeof expiration === 'string' ? { expirationTime: expiration } : {}),
  };
}

async function authorizedFetch(
  url: string,
  accessToken: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    redirect: 'error',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const declared = response.headers.get('content-length');
  if (declared) {
    const size = Number(declared);
    if (!Number.isFinite(size) || size < 0 || size > maxBytes) {
      throw new PowerBiApiError(
        'MALFORMED_RESPONSE',
        'Power BI export exceeds the configured download limit.',
      );
    }
  }

  if (!response.body) {
    throw new PowerBiApiError(
      'MALFORMED_RESPONSE',
      'Power BI returned an empty export.',
    );
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new PowerBiApiError(
          'MALFORMED_RESPONSE',
          'Power BI export exceeds the configured download limit.',
        );
      }
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    if (error instanceof PowerBiApiError) throw error;
    throw new PowerBiApiError(
      'UPSTREAM_ERROR',
      'Power BI export download was interrupted. Try again later.',
    );
  } finally {
    reader.releaseLock();
  }

  if (total === 0) {
    throw new PowerBiApiError(
      'MALFORMED_RESPONSE',
      'Power BI returned an empty export.',
    );
  }
  return Buffer.concat(chunks, total);
}

export const powerBiExportApi: PowerBiExportApi = {
  async start(input) {
    const path = reportPath(input);
    const pageName = safePageName(input.pageName);
    const response = await authorizedFetch(
      `${POWER_BI_API}${path}/ExportTo`,
      input.accessToken,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          format: 'PNG',
          ...(pageName
            ? {
                powerBIReportConfiguration: {
                  pages: [{ pageName }],
                },
              }
            : {}),
        }),
        ...(input.signal ? { signal: input.signal } : {}),
      },
    );
    if (!response.ok) await classifyFailure(response);
    return readStatus(response);
  },

  async poll(input) {
    const path = reportPath(input);
    const exportId = opaqueExportId(input.exportId);
    const response = await authorizedFetch(
      `${POWER_BI_API}${path}/exports/${encodeURIComponent(exportId)}`,
      input.accessToken,
      {
        method: 'GET',
        ...(input.signal ? { signal: input.signal } : {}),
      },
    );
    if (!response.ok) await classifyFailure(response);
    return readStatus(response);
  },

  async download(input) {
    const path = reportPath(input);
    const exportId = opaqueExportId(input.exportId);
    const response = await authorizedFetch(
      `${POWER_BI_API}${path}/exports/${encodeURIComponent(exportId)}/file`,
      input.accessToken,
      {
        method: 'GET',
        headers: { accept: 'application/octet-stream' },
        ...(input.signal ? { signal: input.signal } : {}),
      },
    );
    if (!response.ok) await classifyFailure(response);

    return readBoundedBody(response, input.maxBytes);
  },
};
