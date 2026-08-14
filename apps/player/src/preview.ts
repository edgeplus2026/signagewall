import {
  DEFAULT_ORIENTATION,
  DEFAULT_SCALE,
  isOrientation,
  isScale,
} from './device-settings'
import type { DeviceOrientation, DeviceScale } from './types'

/**
 * The CMS embeds the player in an `<iframe>` to preview content. Preview mode is
 * a read-only spectator: the player connects to the realtime channel with the
 * operator's access token (not a device token), renders the content, and
 * deliberately skips everything a real device does — pairing UI,
 * presence/heartbeat, token and snapshot persistence, daily-reload, and the
 * back/next controls. Suppressing those keeps an open preview tab from
 * masquerading as the physical device.
 *
 * The operator token is NOT carried in the URL (it would leak through browser
 * history and the player server's access logs). It arrives over a postMessage
 * handshake from the embedding CMS instead — see `sync/preview-handshake.ts`.
 */

/** What a preview renders. */
export type PreviewTarget =
  | { kind: 'screen'; screenId: string }
  | { kind: 'playlist'; playlistId: string }

/**
 * How a preview decides what is on screen:
 *  - `follow` mirrors the paired device 1:1 — it runs no clock of its own and
 *    only moves when the device reports a new now-playing. This is the screen
 *    detail view's "what is that display showing right now".
 *  - `standalone` plays the content itself, exactly as a device would. This is
 *    the content preview, which must work with no device paired at all — and is
 *    the only mode a playlist can use, since a playlist has no device to follow.
 */
export type PreviewMode = 'follow' | 'standalone'

export interface PreviewParams {
  target: PreviewTarget
  mode: PreviewMode
  /** Orientation to rotate the rendered content to, mirroring the device. */
  orientation: DeviceOrientation
  /** Content fit mode, mirroring the device. */
  scale: DeviceScale
}

/**
 * Parses the preview parameters from the URL once, or returns null when this is
 * a normal (device) load. We require `preview` AND a target (`screenId` or
 * `playlistId`) — a partial set is treated as a non-preview boot rather than a
 * broken preview, so a stray `?preview=1` can never strand a real device. The
 * token is delivered later via postMessage, so its absence here does not
 * disqualify a preview load.
 */
function parsePreviewParams(): PreviewParams | null {
  if (typeof window === 'undefined') {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const flag = params.get('preview')
  if (flag !== '1' && flag !== 'true') {
    return null
  }

  const screenId = params.get('screenId')
  const playlistId = params.get('playlistId')
  const target: PreviewTarget | null = screenId
    ? { kind: 'screen', screenId }
    : playlistId
      ? { kind: 'playlist', playlistId }
      : null
  if (!target) {
    return null
  }

  const orientationParam = params.get('orientation')
  const scaleParam = params.get('scale')

  return {
    target,
    // A playlist has no device behind it, so following is meaningless there —
    // it is always standalone regardless of what the URL asks for. For a screen
    // the default stays `follow`, which is what the (older) device-mirror URL
    // carries no `mode` for.
    mode:
      target.kind === 'playlist' || params.get('mode') === 'standalone'
        ? 'standalone'
        : 'follow',
    orientation: isOrientation(orientationParam)
      ? orientationParam
      : DEFAULT_ORIENTATION,
    scale: isScale(scaleParam) ? scaleParam : DEFAULT_SCALE,
  }
}

/** Resolved once at module load; the URL never changes within a preview tab. */
export const previewParams: PreviewParams | null = parsePreviewParams()

/** True when this player instance is running as a CMS preview spectator. */
export const isPreview = previewParams !== null

/**
 * True only for a device-mirroring preview. Gates everything that exists to
 * track a real device — the follow-mode playback engine, the now-playing
 * handshake, and standby — none of which a standalone content preview wants.
 */
export const isFollowPreview = previewParams?.mode === 'follow'
