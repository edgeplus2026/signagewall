import { APP_MANIFESTS } from '@signagewall/apps'

import type { Renderable } from '../types'

/**
 * Slugs of apps that decode video while they are on screen, taken from the shared
 * manifest registry (`usesVideoDecoder`) so the set can never drift from the apps
 * themselves — flag an app by editing its manifest, not this file.
 */
const DECODER_APP_SLUGS: ReadonlySet<string> = new Set(
  APP_MANIFESTS.filter((manifest) => manifest.usesVideoDecoder).map(
    (manifest) => manifest.slug,
  ),
)

/**
 * True when `item` occupies one of the device's video decoders while it plays.
 *
 * The engine used to answer this question with `kind === 'video'`, which is wrong
 * in the direction that costs a screen: an on-screen YouTube embed holds a decoder
 * every bit as much as an `.mp4` does, and the engine cheerfully buffered a real
 * video into the other slot behind it. `youtube -> mp4` is a perfectly ordinary
 * rotation, and the hardware this was measured on advertises exactly TWO hardware
 * AVC instances — past them Android silently falls back to a software decoder that
 * SEGV-crashed five times in one night of normal playback.
 *
 * Only ACTIVE items count. A preloaded app is mounted silent and inert until
 * `activate`, so it opens no decoder and must not suppress a preload; that is why
 * this is asked about the item on screen, not about the one being warmed.
 */
export function holdsVideoDecoder(item: Renderable | undefined): boolean {
  if (!item) {
    return false
  }
  return (
    item.kind === 'video' ||
    (item.kind === 'app' && DECODER_APP_SLUGS.has(item.slug))
  )
}
