/**
 * The FIXED allowlist of operator-facing connector error codes. This is the
 * only error vocabulary that may leave the backend: raw provider responses,
 * upstream bodies and credentials never do. The CMS maps each code to a
 * localized remediation message (reconnect, grant consent, check capacity,
 * wait out throttling, retry), so an operator can diagnose a failed setup
 * without log access.
 */
export const CONNECTOR_ERROR_CODES = [
  /** The stored account credential no longer works — reconnect the account. */
  'auth_expired',
  /** The provider needs (re-)consent or an admin grant before data flows. */
  'consent_required',
  /** Authenticated, but this account may not access the selected resource. */
  'permission_denied',
  /** The selected resource is gone (deleted, moved, or renamed upstream). */
  'not_found',
  /** The provider plan/capacity does not allow this operation (e.g. export). */
  'capacity_required',
  /** The provider is rate-limiting us — resolves by itself, retry later. */
  'throttled',
  /** The upstream call timed out — usually transient. */
  'timeout',
  /** The instance configuration is no longer valid — review the settings. */
  'config_invalid',
  /** Any other upstream failure — usually transient, retry. */
  'upstream_error',
] as const

export type ConnectorErrorCode = (typeof CONNECTOR_ERROR_CODES)[number]

export const isConnectorErrorCode = (
  value: unknown,
): value is ConnectorErrorCode =>
  typeof value === 'string' &&
  (CONNECTOR_ERROR_CODES as readonly string[]).includes(value)

/**
 * Typed error a connector throws when it can classify a failure better than
 * the host's generic status-based mapping (e.g. Power BI's capacity or
 * consent responses). The `message` is still host-side only — the code is
 * what reaches the operator.
 */
export class ConnectorError extends Error {
  constructor(
    readonly code: ConnectorErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ConnectorError'
  }
}
