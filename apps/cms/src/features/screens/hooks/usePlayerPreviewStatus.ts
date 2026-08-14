import { useEffect, useState, type RefObject } from 'react'

import { PLAYER_ORIGIN } from '@/features/screens/lib/playerPreviewUrl'

/**
 * How an embedded preview is faring:
 *  - `loading`     — mounted, nothing reported yet.
 *  - `playing`     — content resolved and is on screen.
 *  - `empty`       — connected, but nothing in the snapshot is playable (every
 *                    item disabled, or media still processing).
 *  - `unavailable` — it will not start. Either the player told us the server
 *                    closed its socket, or nothing was ever reported (see
 *                    {@link REPORT_TIMEOUT_MS}).
 */
export type PlayerPreviewStatus = 'loading' | 'playing' | 'empty' | 'unavailable'

/**
 * How long to wait for the player to report anything before calling the preview
 * dead. Generous: it covers loading the player, its token handshake, a socket
 * connect and a snapshot resolve over a slow link — but short enough that a
 * preview which never starts says so instead of staring back in black.
 *
 * This timeout is the ONLY cover for the failures a player cannot report,
 * chiefly a token it refuses (an embedding origin that doesn't match the
 * player's configured `VITE_CMS_ORIGIN`, which is exactly what a local CMS
 * pointed at the deployed player hits) — there, it never connects and so never
 * gets to say anything.
 */
const REPORT_TIMEOUT_MS = 10_000

/**
 * Tracks the status an embedded player preview posts back to us, so the CMS can
 * explain itself rather than leaving an unexplained black rectangle on screen.
 *
 * Same guards as the token handshake: we accept only our own frame's messages,
 * and only from the player's origin.
 */
export function usePlayerPreviewStatus(
  iframeRef: RefObject<HTMLIFrameElement | null>,
): PlayerPreviewStatus {
  const [status, setStatus] = useState<PlayerPreviewStatus>('loading')

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const target = iframeRef.current?.contentWindow
      if (!target || event.source !== target) {
        return
      }
      if (event.origin !== PLAYER_ORIGIN) {
        return
      }
      const data = event.data as { type?: unknown; status?: unknown } | null
      if (data?.type !== 'preview-status') {
        return
      }
      if (
        data.status === 'playing' ||
        data.status === 'empty' ||
        data.status === 'unavailable'
      ) {
        setStatus(data.status)
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [iframeRef])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Only give up on a preview that has said nothing at all. One that
      // reported and then went quiet has already told us what it is.
      setStatus((current) => (current === 'loading' ? 'unavailable' : current))
    }, REPORT_TIMEOUT_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  return status
}
