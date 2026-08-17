import { useEffect, type RefObject } from 'react'

import { useAuthStore } from '@/features/auth/store/authStore'
import { PLAYER_ORIGIN } from '@/features/screens/lib/playerPreviewUrl'

/**
 * Hands the operator's access token to an embedded player preview iframe.
 *
 * The token is what authorizes the preview as a read-only spectator, and it is
 * deliberately NOT in the iframe URL — a cross-origin URL leaks through browser
 * history and the player server's access logs. Instead the embedded player
 * announces itself with a `preview-ready` postMessage and we answer with the
 * token, addressed to the player origin only.
 *
 * We answer only our own frame (`event.source`), accept the announcement only
 * from the player's origin, and target the reply at that same origin — so no
 * other frame on the page can either provoke or read the token.
 *
 * Returns the token, or null while the operator has none: the caller must not
 * mount the iframe until then, or the player would announce readiness to a
 * listener that has nothing to give it and never retries.
 */
export function usePlayerPreviewToken(
  iframeRef: RefObject<HTMLIFrameElement | null>,
): string | null {
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (!token) {
      return
    }
    const onMessage = (event: MessageEvent) => {
      const target = iframeRef.current?.contentWindow
      if (!target || event.source !== target) {
        return
      }
      if (event.origin !== PLAYER_ORIGIN) {
        return
      }
      if ((event.data as { type?: unknown } | null)?.type === 'preview-ready') {
        target.postMessage({ type: 'preview-token', token }, PLAYER_ORIGIN)
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [token, iframeRef])

  return token ?? null
}
