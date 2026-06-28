import type {
  ScreenDeviceOrientation,
  ScreenDeviceScale,
} from '@/features/screens/types/screen.types'

/** Origin of the player app. The bare URL opens the regular (pairing) player. */
export const PLAYER_URL: string =
  import.meta.env.VITE_PLAYER_URL ?? 'http://localhost:5174'

interface PreviewUrlParams {
  screenId: string
  token: string
  orientation: ScreenDeviceOrientation
  scale: ScreenDeviceScale
}

/**
 * Builds the player URL that renders a screen in read-only preview mode, used by
 * the embedded preview iframe. Orientation/scale seed the initial render; live
 * changes then arrive over the socket.
 */
export function buildPlayerPreviewUrl({
  screenId,
  token,
  orientation,
  scale,
}: PreviewUrlParams): string {
  return (
    `${PLAYER_URL}/?preview=1` +
    `&screenId=${encodeURIComponent(screenId)}` +
    `&token=${encodeURIComponent(token)}` +
    `&orientation=${orientation}` +
    `&scale=${scale}`
  )
}
