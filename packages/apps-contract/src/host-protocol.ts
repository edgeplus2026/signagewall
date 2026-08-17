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
 *   3. host → app:   `{ type: 'app-active', active, muted }` whenever the app
 *      becomes the on-screen (active) item or leaves it, or the screen's audio
 *      state changes. Optional and idempotent.
 *
 * The app may receive `app-config` more than once (live config edits in the CMS
 * preview); bundles must treat each as the latest state and re-render idempotently.
 *
 * The `app-active` signal exists because the player double-buffers: it *preloads*
 * the next item into a hidden slot so the swap is instant. A hidden slot is only
 * `display:none`, which suppresses the picture but NOT audio — so a media app
 * (e.g. YouTube) preloaded there would start blaring sound while the previous
 * item is still on screen. Media apps must therefore stay silent until they get
 * `app-active` with `active: true`, and stop on `active: false`. Apps default to
 * *inactive*: one that never receives the signal must not autoplay audio.
 *
 * The same message carries `muted`, so the screen's master volume governs app
 * audio too (volume 0 ⇒ `muted: true`) — a `<video>`-only mute would leave a
 * media app like YouTube blaring. The CMS live preview always sends `muted: true`
 * (a preview is never audible). Apps default to *muted* when the flag is absent.
 */

import type { ConnectorErrorCode } from './connector-error.js'

export const APP_READY_TYPE = 'app-ready'
export const APP_CONFIG_TYPE = 'app-config'
export const APP_ACTIVE_TYPE = 'app-active'

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
  /**
   * Why the latest fetch failed, as one of the fixed operator-safe codes —
   * populated on the CMS preview surface so the operator gets remediation
   * guidance (reconnect, grant consent, capacity, throttling) without ever
   * seeing raw upstream errors. Absent on success.
   */
  errorCode?: ConnectorErrorCode
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

/**
 * host → app: toggles whether the app is the on-screen (active) item, and
 * whether its audio is muted. Media apps gate playback on `active` (so a
 * preloaded/hidden instance stays silent) and mute their audio on `muted` (so
 * the screen's master volume — and the always-muted preview — govern app sound).
 */
export interface AppActiveMessage {
  type: typeof APP_ACTIVE_TYPE
  active: boolean
  muted: boolean
}

/** Type guard: an inbound `app-ready` message (host side). */
export function isAppReadyMessage(data: unknown): data is AppReadyMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === APP_READY_TYPE
  )
}

/** Type guard: an inbound `app-active` message (app side). */
export function isAppActiveMessage(data: unknown): data is AppActiveMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === APP_ACTIVE_TYPE &&
    typeof (data as { active?: unknown }).active === 'boolean'
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
