import { ConnectorError, ConnectorErrorCode } from '@signagewall/apps-contract';

/**
 * Maps an arbitrary connector failure onto the fixed operator-safe code
 * allowlist. Raw provider errors (messages, bodies, statuses) never leave the
 * backend — only the code does, and the CMS turns it into remediation
 * guidance. Connectors that know better throw a typed {@link ConnectorError}
 * (e.g. Power BI capacity/consent responses); everything else is classified
 * here from common HTTP shapes, conservatively defaulting to a retryable
 * `upstream_error`.
 */
export function classifyConnectorError(error: unknown): ConnectorErrorCode {
  if (error instanceof ConnectorError) {
    return error.code;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return 'timeout';
  }

  const status = extractStatus(error);
  if (status !== undefined) {
    return fromStatus(status);
  }

  if (error instanceof Error) {
    return classifyConnectorMessage(error.message);
  }

  return 'upstream_error';
}

/**
 * Classification for soft errors that only exist as sanitized strings (a
 * pending job's `ConnectorResult.error`, or a persisted `lastError`). Most of
 * the codebase's fetch helpers embed the upstream HTTP status in the message
 * (`"graph workbook upstream 403"`), which is enough to name the failure.
 */
export function classifyConnectorMessage(message: string): ConnectorErrorCode {
  const text = message.toLowerCase();

  if (/\b401\b|unauthorized|token expired|invalid_grant/.test(text)) {
    return 'auth_expired';
  }
  if (/consent/.test(text)) {
    return 'consent_required';
  }
  if (/\b403\b|forbidden|permission/.test(text)) {
    return 'permission_denied';
  }
  if (/\b404\b|not found/.test(text)) {
    return 'not_found';
  }
  if (/\b429\b|rate limit|throttl|too many requests/.test(text)) {
    return 'throttled';
  }
  if (/timeout|timed out|aborted/.test(text)) {
    return 'timeout';
  }
  if (/capacity/.test(text)) {
    return 'capacity_required';
  }
  return 'upstream_error';
}

/** HTTP status carried on common error shapes (fetch wrappers, axios-likes). */
function extractStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  for (const value of [
    candidate.status,
    candidate.statusCode,
    candidate.response?.status,
  ]) {
    if (typeof value === 'number' && value >= 100 && value <= 599) {
      return value;
    }
  }
  return undefined;
}

function fromStatus(status: number): ConnectorErrorCode {
  if (status === 401) return 'auth_expired';
  if (status === 403) return 'permission_denied';
  if (status === 404 || status === 410) return 'not_found';
  if (status === 429) return 'throttled';
  if (status === 408 || status === 504) return 'timeout';
  return 'upstream_error';
}
