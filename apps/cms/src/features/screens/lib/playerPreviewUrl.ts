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
 * Builds the player URL that renders a screen in read-only preview mode, used by
 * the embedded preview iframe. Orientation/scale seed the initial render; live
 * changes then arrive over the socket.
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
