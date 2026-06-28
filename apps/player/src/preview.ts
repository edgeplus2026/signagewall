import {
  DEFAULT_ORIENTATION,
  DEFAULT_SCALE,
  isOrientation,
  isScale,
} from './device-settings'
import type { DeviceOrientation, DeviceScale } from './types'

/**
 * The CMS embeds the player in an `<iframe>` to show a live preview of what a
 * paired screen is currently playing. Preview mode is a read-only spectator:
 * the player connects to the realtime channel with the operator's access token
 * (not a device token), renders the screen's content, and deliberately skips
 * everything a real device does — pairing UI, presence/heartbeat, token and
 * snapshot persistence, daily-reload, and the back/next controls. Suppressing
 * those keeps an open preview tab from masquerading as the physical device.
 */
export interface PreviewParams {
  screenId: string
  /** CMS access token (JWT) authorizing the spectator. */
  token: string
  /** Orientation to rotate the rendered content to, mirroring the device. */
  orientation: DeviceOrientation
  /** Content fit mode, mirroring the device. */
  scale: DeviceScale
}

/**
 * Parses the preview parameters from the URL once, or returns null when this is
 * a normal (device) load. We require both `preview` and a `screenId`/`token`
 * pair — a partial set is treated as a non-preview boot rather than a broken
 * preview, so a stray `?preview=1` can never strand a real device.
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
  const token = params.get('token')
  if (!screenId || !token) {
    return null
  }

  const orientationParam = params.get('orientation')
  const scaleParam = params.get('scale')

  return {
    screenId,
    token,
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
