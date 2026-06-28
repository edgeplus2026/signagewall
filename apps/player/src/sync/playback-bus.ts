/**
 * A tiny bridge between the realtime command channel and the imperative
 * playback engine. The engine instance lives inside the Stage component and
 * isn't reachable from the socket layer; rather than thread it through every
 * call site, the Stage registers its step handlers here on mount and clears
 * them on unmount. The socket handler invokes whichever is registered (a no-op
 * before the engine exists). Used for remote next/prev — e.g. the operator
 * scrubbing the live display from the CMS preview.
 */
interface PlaybackControls {
  next: () => void
  previous: () => void
  /** Follow mode only: jump to a specific item id (mirror the device). */
  showItem: (itemId: string) => void
}

let controls: PlaybackControls | null = null

export function registerPlaybackControls(next: PlaybackControls): () => void {
  controls = next
  return () => {
    if (controls === next) {
      controls = null
    }
  }
}

export function playbackNext(): void {
  controls?.next()
}

export function playbackPrevious(): void {
  controls?.previous()
}

export function playbackShowItem(itemId: string): void {
  controls?.showItem(itemId)
}
