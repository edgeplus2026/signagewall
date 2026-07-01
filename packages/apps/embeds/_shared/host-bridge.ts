/**
 * Iframe (app) side of the player ↔ app handshake. The app-side mirror of the
 * hosts (the player's `apps/player/src/apps/host-bridge.ts` and the CMS preview
 * host), which both implement the shared wire protocol in
 * `@edge/apps-contract` (`host-protocol.ts`).
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
 * `@edge/apps-contract` (`APP_READY_TYPE` / `APP_CONFIG_TYPE`). They are kept
 * inline (not imported) so the embed bundles stay tiny and dependency-free —
 * importing the contract barrel would pull `zod` into every app bundle.
 */

const READY_MESSAGE = { type: 'app-ready' } as const
const CONFIG_TYPE = 'app-config'

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
}

interface RawConfigMessage {
  type: typeof CONFIG_TYPE
  config: unknown
  data: unknown
  meta: unknown
}

function isConfigMessage(data: unknown): data is RawConfigMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === CONFIG_TYPE
  )
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
>(onConfig: (message: AppConfigMessage<Config, Payload>) => void): () => void {
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
      onConfig({
        config: event.data.config as Config,
        data: (event.data.data ?? null) as Payload | null,
        meta: (event.data.meta ?? null) as AppDataMeta | null,
      })
    }
  }

  window.addEventListener('message', onMessage)
  parent.postMessage(READY_MESSAGE, '*')

  return () => {
    window.removeEventListener('message', onMessage)
  }
}
