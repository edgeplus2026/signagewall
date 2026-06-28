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
