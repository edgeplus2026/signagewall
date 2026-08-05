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
export interface AppConnector<
  Config = Record<string, unknown>,
  Payload = unknown,
> {
  /**
   * Optional de-duplication key. Instances that resolve to the same key share a
   * single fetch (e.g. all "Weather / Niš" instances → `weather:nis`), and the
   * result is fanned out to every instance with that key.
   */
  cacheKey?(config: Config): string;

  /**
   * Optional per-instance polling cadence derived from validated config.
   * The host falls back to the manifest's `refreshSeconds` when absent. Return
   * a finite positive number; the host rejects invalid values instead of
   * turning a bad config into a hot scheduler loop.
   */
  refreshSeconds?(config: Config): number;

  /**
   * Fetch & normalize external data. Called by the scheduler per due cache-key
   * at the manifest's refresh cadence. Must be idempotent and side-effect free
   * beyond returning data.
   */
  fetchData(
    config: Config,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<Payload>>;

  /**
   * OAuth descriptor(s) for `connected` apps; absent for plain `server` apps.
   * An array means the app supports several providers (e.g. a tabular app that
   * syncs from Google Sheets *or* Microsoft Excel) — resolve the one in play
   * with {@link oauthDescriptorFor}.
   */
  oauth?: OAuthDescriptor | OAuthDescriptor[];

  /**
   * For connectors that self-subscribe to provider push notifications inside
   * `fetchData` (the Google channel pattern): the API route, relative to the
   * API base, that the provider should POST to (e.g. `'webhooks/google/drive'`).
   * The host builds the absolute `ConnectorContext.webhookUrl` from it; absent
   * means the connector never receives a `webhookUrl`.
   */
  webhookPath?: string;

  /**
   * For connectors whose push subscriptions are orchestrated externally (the
   * Microsoft Graph pattern — subscriptions are managed per config save, not by
   * the connector): given a validated config, name the provider resource to
   * watch, or null when the current config has nothing to subscribe to. Two
   * shapes:
   *  - `packedDriveItem` (`"driveId|itemId"`): a OneDrive/SharePoint file; the
   *    host subscribes to that item's drive ROOT (PowerPoint deck, menu Excel).
   *  - `graphResource`: an explicit Graph resource path to subscribe to, with
   *    the change types to watch (Outlook Calendar: the calendar's events, e.g.
   *    `/me/calendars/{id}/events` on `'created,updated,deleted'`).
   */
  webhookResource?(
    config: Config,
  ):
    | { provider: "microsoft"; packedDriveItem: string }
    | { provider: "microsoft"; graphResource: string; changeType?: string }
    | null;

  /**
   * Optional per-connector fetch budget (ms) overriding the host default. Raise
   * it for connectors whose upstream is a slow async job — e.g. Canva mp4 export
   * (video rendering) can take far longer than the default image/JSON fetch.
   */
  timeoutMs?: number;
}

export interface ConnectorContext {
  /**
   * Owning organization, when the fetch is tied to one. Omitted by the global
   * scheduler/webhook runtime (the connector cache is shared across orgs and a
   * coarse `cacheKey` carries no org), so connectors must not rely on it for
   * `server` apps; `connected` apps get tenant identity from {@link connection}.
   */
  organizationId?: string;
  /** Resolved connection (decrypted tokens) for `connected` apps. */
  connection?: ResolvedConnection;
  /**
   * The `secrets` this connector persisted on its previous fetch for this cache
   * key (server-side only; never from the player). Lets a connector be a state
   * machine across fetches — e.g. remember an in-flight async export job and
   * check it on the next tick instead of blocking. Undefined on the first fetch.
   */
  secrets?: Record<string, unknown>;
  /**
   * The address a provider should POST change notifications to, when this
   * deployment has a publicly reachable one. A connector that can subscribe to
   * upstream changes (Google Calendar's `events.watch`) registers this as its
   * callback and remembers the resulting channel in {@link secrets}.
   *
   * UNDEFINED IS THE NORMAL CASE, not an error: a laptop running the API on
   * localhost has no address Google could reach, and a connector must simply skip
   * the subscription and let the poll cadence carry it. Push is an accelerator on
   * top of polling — never the only thing keeping a screen current, because a
   * channel expires, a ping gets lost, and neither failure announces itself.
   */
  webhookUrl?: string;
  /** Structured logger from the host. */
  logger: ConnectorLogger;
  signal?: AbortSignal;
}

export interface ConnectorLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface ConnectorResult<Payload> {
  /**
   * Public, sanitized data sent to the player. Optional only for a `pending`
   * result (an async job is still running) — the host then keeps the last-known
   * payload on screen. A normal (non-pending) result must provide it.
   */
  playerPayload?: Payload;
  /**
   * True when the result isn't final because an async upstream job is still in
   * progress (e.g. a Canva video export). The host preserves the existing cached
   * payload, persists {@link secrets}, and re-checks on the next tick until the
   * connector returns a final payload.
   */
  pending?: boolean;
  /**
   * Optional sanitized, operator-facing failure while a resumable async state
   * is still persisted. The host marks the last-known payload stale but keeps
   * `secrets`, unlike a thrown error which ends the pending job. Never include
   * tokens, signed URLs, or raw upstream response bodies.
   */
  error?: string;
  /** Optional private data persisted server-side only (never sent to players). */
  secrets?: Record<string, unknown>;
  /**
   * Optional stable content signature (e.g. an ETag). When present, the host
   * uses it — instead of comparing the whole payload — to decide whether the
   * data changed and a fan-out is needed. Connectors whose payload includes
   * volatile fields (rotating signed URLs, timestamps) should set this so they
   * don't fan out on every refresh when the underlying content is unchanged.
   */
  version?: string;
}

export interface ResolvedConnection {
  id: string;
  /** Organization that owns the persisted connection; never sourced from app config. */
  organizationId: string;
  /** App instance that owns the persisted connection; never sourced from app config. */
  appInstanceId: string;
  /** The OAuth provider this connection belongs to (e.g. 'google', 'canva'). */
  provider: string;
  accountLabel: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes: string[];
}

export interface OAuthDescriptor {
  provider: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

/** All OAuth descriptors of a connector, normalized to an array. */
export function oauthDescriptors(
  connector: { oauth?: OAuthDescriptor | OAuthDescriptor[] } | undefined,
): OAuthDescriptor[] {
  if (!connector?.oauth) return [];
  return Array.isArray(connector.oauth) ? connector.oauth : [connector.oauth];
}

/** The connector's OAuth descriptor for `provider`, if it supports it. */
export function oauthDescriptorFor(
  connector: { oauth?: OAuthDescriptor | OAuthDescriptor[] } | undefined,
  provider: string,
): OAuthDescriptor | undefined {
  return oauthDescriptors(connector).find(
    (descriptor) => descriptor.provider === provider,
  );
}
