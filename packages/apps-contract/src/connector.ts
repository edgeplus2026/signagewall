/**
 * The server-side half of an app. Implemented in the backend for `server` and
 * `connected` apps; `static` apps have no connector.
 *
 * The connector's job: fetch external data, normalize it, and split the result
 * into a public `playerPayload` (safe to send to players) and private `secrets`
 * (tokens/credentials that NEVER leave the backend).
 *
 * `Config` is the validated instance config; `Payload` is the normalized shape
 * the player render component consumes.
 */
export interface AppConnector<Config = Record<string, unknown>, Payload = unknown> {
  /**
   * Optional de-duplication key. Instances that resolve to the same key share a
   * single fetch (e.g. all "Weather / Niš" instances → `weather:nis`), and the
   * result is fanned out to every instance with that key.
   */
  cacheKey?(config: Config): string

  /**
   * Fetch & normalize external data. Called by the scheduler per due cache-key
   * at the manifest's refresh cadence. Must be idempotent and side-effect free
   * beyond returning data.
   */
  fetchData(config: Config, ctx: ConnectorContext): Promise<ConnectorResult<Payload>>

  /** OAuth descriptor for `connected` apps; absent for plain `server` apps. */
  oauth?: OAuthDescriptor
}

export interface ConnectorContext {
  organizationId: string
  /** Resolved connection (decrypted tokens) for `connected` apps. */
  connection?: ResolvedConnection
  /** Structured logger from the host. */
  logger: ConnectorLogger
  signal?: AbortSignal
}

export interface ConnectorLogger {
  debug(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export interface ConnectorResult<Payload> {
  /** Public, sanitized data sent to the player. */
  playerPayload: Payload
  /** Optional private data persisted server-side only (never sent to players). */
  secrets?: Record<string, unknown>
}

export interface ResolvedConnection {
  id: string
  accountLabel: string
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  scopes: string[]
}

export interface OAuthDescriptor {
  provider: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
}
