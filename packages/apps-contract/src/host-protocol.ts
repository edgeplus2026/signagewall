/**
 * The player ↔ app postMessage handshake — the single source of truth shared by
 * every *host* (the player's generic iframe host and the CMS live-preview host)
 * and every *app* (the embed bundles' `_shared/host-bridge`). Keeping the
 * message types here stops the three independent host implementations from
 * drifting apart.
 *
 * Sequence (mirrors the preview-token handshake in the player's
 * `sync/preview-handshake.ts`):
 *   1. app → host:   `{ type: 'app-ready' }` once the bundle is listening.
 *   2. host → app:   `{ type: 'app-config', config, data, meta }` addressed to
 *      the app's origin only.
 *
 * The app may receive `app-config` more than once (live config edits in the CMS
 * preview); bundles must treat each as the latest state and re-render idempotently.
 */

export const APP_READY_TYPE = 'app-ready'
export const APP_CONFIG_TYPE = 'app-config'

/** Freshness metadata for `server`-app payloads; `null`/absent for static apps. */
export interface AppDataMeta {
  /** ISO time the payload was last successfully fetched, if ever. */
  fetchedAt?: string
  /** True when the latest fetch failed (the payload is last-known-good). */
  stale?: boolean
  /**
   * True while an async upstream job (e.g. a Canva video export) is still
   * running and the final payload isn't ready. The live preview polls until this
   * clears; the bundle may show a "generating…" state.
   */
  pending?: boolean
}

/** app → host: the bundle announces it is listening. Carries no data. */
export interface AppReadyMessage {
  type: typeof APP_READY_TYPE
}

/** host → app: the config + connector payload the bundle renders. */
export interface AppConfigMessage<
  Config = Record<string, unknown>,
  Payload = unknown,
> {
  type: typeof APP_CONFIG_TYPE
  config: Config
  /** Connector payload; `null` for static apps or before the first fetch. */
  data: Payload | null
  /** Data freshness for `server` apps; `null` for static apps. */
  meta: AppDataMeta | null
}

/** Type guard: an inbound `app-ready` message (host side). */
export function isAppReadyMessage(data: unknown): data is AppReadyMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === APP_READY_TYPE
  )
}

/** Type guard: an inbound `app-config` message (app side). */
export function isAppConfigMessage(data: unknown): data is AppConfigMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === APP_CONFIG_TYPE
  )
}
