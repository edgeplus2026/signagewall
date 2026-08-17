import type {
  ScreenDeviceOrientation,
  ScreenDeviceRecoveryLink,
  ScreenDeviceScale,
} from '@/features/screens/types/screen.types'

/** Origin of the player app. The bare URL opens the regular (pairing) player. */
export const PLAYER_URL: string =
  import.meta.env.VITE_PLAYER_URL ?? 'http://localhost:5174'

interface PreviewUrlParams {
  screenId: string
  orientation: ScreenDeviceOrientation
  scale: ScreenDeviceScale
}

/** Origin of the player app, used as the postMessage target for the token. */
export const PLAYER_ORIGIN: string = new URL(PLAYER_URL).origin

/**
 * Builds the "Open web player" URL for an already-paired screen from a freshly
 * minted recovery grant: the device's stable identity (`?device=<uuid>`) plus a
 * single-use, short-lived recovery code (`?recovery=<code>`). The backend
 * consumes the code atomically on first connect and rotates the device token —
 * a bare `deviceId` is deliberately NOT a credential, so a stale or leaked copy
 * of this URL admits nobody.
 */
export function buildPlayerRecoveryUrl(link: ScreenDeviceRecoveryLink): string {
  return (
    `${PLAYER_URL}/?device=${encodeURIComponent(link.deviceId)}` +
    `&recovery=${encodeURIComponent(link.recoveryCode)}`
  )
}

/**
 * Builds the player URL that mirrors a paired display in read-only preview
 * mode, used by the embedded live-preview iframe on the screen's device tab.
 * The player runs no clock of its own here: it shows whatever item the device
 * reports. Orientation/scale seed the initial render; live changes then arrive
 * over the socket.
 *
 * The operator token is deliberately NOT in the URL — it would leak through
 * browser history and the player server's access logs. It is delivered over a
 * postMessage handshake after the iframe loads (see PlayerPreviewFrame).
 */
export function buildPlayerPreviewUrl({
  screenId,
  orientation,
  scale,
}: PreviewUrlParams): string {
  return (
    `${PLAYER_URL}/?preview=1` +
    `&screenId=${encodeURIComponent(screenId)}` +
    `&orientation=${orientation}` +
    `&scale=${scale}`
  )
}

/** What a content preview plays — a whole screen, or a playlist on its own. */
export type PlayerPreviewTarget =
  | { kind: 'screen'; screenId: string }
  | { kind: 'playlist'; playlistId: string }

/** How the previewed content is laid out, when the target has a display. */
interface PreviewDisplayParams {
  orientation?: ScreenDeviceOrientation | undefined
  scale?: ScreenDeviceScale | undefined
}

/**
 * Builds the player URL for a *standalone* content preview: the player plays
 * the target itself, exactly as a display would, instead of mirroring a device.
 * That is what lets a screen with nothing paired to it — or a playlist, which
 * has no device at all — still be previewed.
 *
 * `display` carries the screen's own orientation/scale so a portrait screen
 * previews rotated the way it actually plays; omitted (playlists, or a screen
 * with no device settings yet) the player falls back to its defaults.
 *
 * Same token rule as {@link buildPlayerPreviewUrl}: the operator token stays
 * out of the URL and arrives over the postMessage handshake.
 */
export function buildContentPreviewUrl(
  target: PlayerPreviewTarget,
  display: PreviewDisplayParams = {},
): string {
  const params = new URLSearchParams({ preview: '1', mode: 'standalone' })
  if (target.kind === 'screen') {
    params.set('screenId', target.screenId)
  } else {
    params.set('playlistId', target.playlistId)
  }
  if (display.orientation) {
    params.set('orientation', display.orientation)
  }
  if (display.scale) {
    params.set('scale', display.scale)
  }
  return `${PLAYER_URL}/?${params.toString()}`
}
