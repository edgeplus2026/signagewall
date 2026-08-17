import { config } from '../config'

/**
 * Preview token handshake (player side).
 *
 * The CMS embeds the player as a preview iframe. The operator's access token
 * must NOT travel in the iframe URL — a cross-origin URL leaks through browser
 * history and the player server's access logs. Instead we run a tiny two-way
 * postMessage handshake:
 *
 *   1. player → parent: `{ type: 'preview-ready' }` (no secret) once we are
 *      listening, so the parent never posts the token before we can receive it.
 *   2. parent → player: `{ type: 'preview-token', token }` addressed to our
 *      origin only.
 *
 * We accept the token only from the embedding parent frame, and — when a CMS
 * origin is configured — only from that origin.
 */

const READY_MESSAGE = { type: 'preview-ready' } as const
const TOKEN_TYPE = 'preview-token'
const STATUS_TYPE = 'preview-status'

/**
 * What the embedding CMS is told about the preview, so it can say something
 * useful instead of leaving an unexplained black rectangle on screen:
 *  - `playing`     — content resolved and is on screen.
 *  - `empty`       — we are connected, but the snapshot has nothing playable
 *                    (every item disabled, or media still processing).
 *  - `unavailable` — the server closed our socket: unknown target, no
 *                    membership, a rejected token, or a backend that does not
 *                    understand this preview. Terminal; nothing will arrive.
 *
 * The CMS covers the remaining case (nothing reported at all — e.g. the token
 * never reached us) with its own timeout; a player that cannot start has, by
 * definition, no way to say so.
 */
export type PreviewStatus = 'playing' | 'empty' | 'unavailable'

interface PreviewTokenMessage {
  type: typeof TOKEN_TYPE
  token: string
}

function isTokenMessage(data: unknown): data is PreviewTokenMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === TOKEN_TYPE &&
    typeof (data as { token?: unknown }).token === 'string' &&
    (data as { token: string }).token.length > 0
  )
}

/**
 * Listens for the operator token from the embedding CMS and invokes `onToken`
 * with it. No-op (returns a disposer that does nothing) when the player is not
 * embedded. Returns a disposer that detaches the listener.
 */
export function requestPreviewToken(
  onToken: (token: string) => void,
): () => void {
  if (typeof window === 'undefined' || window.parent === window) {
    return () => undefined
  }

  const parent = window.parent
  const expectedOrigin = config.cmsOrigin

  const onMessage = (event: MessageEvent): void => {
    // Only the embedding parent may hand us a token…
    if (event.source !== parent) {
      return
    }
    // …and, when configured, only from the known CMS origin.
    if (expectedOrigin && event.origin !== expectedOrigin) {
      return
    }
    if (isTokenMessage(event.data)) {
      onToken(event.data.token)
    }
  }

  window.addEventListener('message', onMessage)
  // Announce readiness so the parent posts the token only once we're listening.
  // The ready ping carries no secret, so a wildcard target origin is safe.
  parent.postMessage(READY_MESSAGE, '*')

  return () => {
    window.removeEventListener('message', onMessage)
  }
}

/**
 * Tells the embedding CMS how the preview is faring. No-op when not embedded.
 *
 * Carries no secret — only a status word — so a wildcard target origin is safe
 * where no CMS origin is configured; where one is, we address it.
 */
export function reportPreviewStatus(status: PreviewStatus): void {
  if (typeof window === 'undefined' || window.parent === window) {
    return
  }
  window.parent.postMessage(
    { type: STATUS_TYPE, status },
    config.cmsOrigin || '*',
  )
}
