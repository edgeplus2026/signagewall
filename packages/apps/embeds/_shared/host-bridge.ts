/**
 * Iframe (app) side of the player ↔ app handshake. The app-side mirror of the
 * hosts (the player's `apps/player/src/apps/host-bridge.ts` and the CMS preview
 * host), which both implement the shared wire protocol in
 * `@signagewall/apps-contract` (`host-protocol.ts`).
 *
 * Sequence:
 *   1. app → parent:  `{ type: 'app-ready' }` once we are listening, so the host
 *      never posts the config before we can receive it. The ready ping carries
 *      no data, so a wildcard target origin is safe.
 *   2. parent → app:  `{ type: 'app-config', config, data, meta }` addressed to
 *      our origin. We render on each such message from the embedding parent.
 *
 * The app bundle is loaded same-origin under `/apps/<slug>/`, so the host and
 * the app share an origin; we still pin the message source to the parent frame.
 *
 * NOTE: the constants below are the wire format and MUST match
 * `@signagewall/apps-contract` (`APP_READY_TYPE` / `APP_CONFIG_TYPE`). They are kept
 * inline (not imported) so the embed bundles stay tiny and dependency-free —
 * importing the contract barrel would pull `zod` into every app bundle.
 */

const READY_MESSAGE = { type: 'app-ready' } as const
const CONFIG_TYPE = 'app-config'
const ACTIVE_TYPE = 'app-active'

/** Freshness metadata for `server`-app payloads (`null` for static apps). */
export interface AppDataMeta {
  /** ISO time the payload was last successfully fetched, if ever. */
  fetchedAt?: string
  /** True when the latest fetch failed (the payload is last-known-good). */
  stale?: boolean
  /** True while an async upstream job is still running (e.g. Canva video export). */
  pending?: boolean
}

export interface AppConfigMessage<
  Config = Record<string, unknown>,
  Payload = unknown,
> {
  config: Config
  /** Connector payload; `null` for static apps or before the first fetch. */
  data: Payload | null
  /** Data freshness for `server` apps; `null` for static apps. */
  meta: AppDataMeta | null
  /**
   * How long this app is on screen before the rotation moves on, in ms.
   *
   * Absent where there is no dwell to speak of — the CMS live preview, which
   * runs until the operator closes it — so treat absent as "unbounded".
   *
   * An app that advances through pages, stories or slides on a timer must
   * divide THIS rather than run its configured interval blind. The interval is
   * a ceiling the operator asked for, not a promise the slot can keep: a 20 s
   * page in a 15 s slot never turns over at all, so everything past page one is
   * silently never shown, and nothing on screen says a page was skipped.
   */
  durationMs?: number
}

interface RawConfigMessage {
  type: typeof CONFIG_TYPE
  config: unknown
  data: unknown
  meta: unknown
  durationMs?: unknown
}

interface RawActiveMessage {
  type: typeof ACTIVE_TYPE
  active: boolean
  muted?: boolean
}

function isConfigMessage(data: unknown): data is RawConfigMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === CONFIG_TYPE
  )
}

function isActiveMessage(data: unknown): data is RawActiveMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === ACTIVE_TYPE &&
    typeof (data as { active?: unknown }).active === 'boolean'
  )
}

/** Options for {@link connectToHost}. */
export interface ConnectOptions {
  /**
   * Fires whenever the host toggles this app between the on-screen (active) item
   * and a hidden/preloaded one, or the screen's audio state changes. Media apps
   * MUST gate playback on `active`: the player preloads the next item into a
   * hidden slot, and `display:none` mutes the picture but NOT the audio — so an
   * app that autoplays sound on config alone would blare while the previous item
   * is still up. `muted` carries the screen's master mute (the always-muted
   * preview sends `true`); play silent when it is set. Apps default to inactive
   * AND muted: do not start audible playback until this fires with
   * `active: true, muted: false`. May fire before or after the first config, and
   * repeatedly.
   */
  onActive?: (active: boolean, muted: boolean) => void
}

/**
 * Announces readiness to the embedding player and invokes `onConfig` with the
 * config/data the host posts back. Returns a disposer that detaches the
 * listener. No-op (disposer does nothing) when not embedded in a parent frame.
 *
 * `onConfig` may fire more than once if the host re-sends config; apps should
 * treat each call as the latest state and re-render idempotently.
 */
export function connectToHost<
  Config = Record<string, unknown>,
  Payload = unknown,
>(
  onConfig: (message: AppConfigMessage<Config, Payload>) => void,
  options: ConnectOptions = {},
): () => void {
  if (typeof window === 'undefined' || window.parent === window) {
    return () => undefined
  }

  const parent = window.parent

  const onMessage = (event: MessageEvent): void => {
    // Only the embedding parent may configure us.
    if (event.source !== parent) {
      return
    }
    if (isConfigMessage(event.data)) {
      const durationMs = event.data.durationMs
      onConfig({
        config: event.data.config as Config,
        data: (event.data.data ?? null) as Payload | null,
        meta: (event.data.meta ?? null) as AppDataMeta | null,
        // Left absent unless the host sent a real, positive dwell — a host that
        // predates the field, or one with no dwell at all, must read as
        // "unbounded" rather than as a zero-length slot.
        ...(typeof durationMs === 'number' &&
        Number.isFinite(durationMs) &&
        durationMs > 0
          ? { durationMs }
          : {}),
      })
    } else if (isActiveMessage(event.data)) {
      // Default to muted when the flag is absent — never blast audio on a stale
      // or partial message.
      options.onActive?.(event.data.active, event.data.muted ?? true)
    }
  }

  window.addEventListener('message', onMessage)
  parent.postMessage(READY_MESSAGE, '*')

  return () => {
    window.removeEventListener('message', onMessage)
  }
}
