import type {
  ScreenDeviceOrientation,
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
 * Builds the "Open web player" URL for an already-paired screen, carrying the
 * device's stable `deviceId` (`?device=<uuid>`). The player uses it as an
 * identity-recovery anchor: if the player's localStorage was wiped, opening this
 * URL lets it re-adopt the same `deviceId` and slide back into this screen — the
 * backend re-issues its token on reconnect, so no re-pairing is needed.
 *
 * SECURITY: the backend re-issues a token to any connection that presents a known
 * paired `deviceId` (it does NOT prove prior ownership), so this link effectively
 * acts as a recovery credential for the screen — anyone who obtains it can bind a
 * fresh browser to this device. Treat it as sensitive: it lands in browser history
 * and server access logs. The `deviceId` is a 122-bit UUID (unguessable), so the
 * risk is disclosure of the link, not brute force.
 */
export function buildPlayerDeviceUrl(deviceId: string): string {
  return `${PLAYER_URL}/?device=${encodeURIComponent(deviceId)}`
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
