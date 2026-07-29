import { APP_MANIFESTS } from '@signagewall/apps'

import type { Renderable } from '../types'

/**
 * Slugs of apps whose manifest declares they need live internet to render
 * (`requiresNetwork`). Derived from the shared manifest registry so the set
 * never drifts from the apps themselves — flag an app by editing its manifest,
 * not this file.
 */
const NETWORK_APP_SLUGS: ReadonlySet<string> = new Set(
  APP_MANIFESTS.filter((manifest) => manifest.requiresNetwork).map(
    (manifest) => manifest.slug,
  ),
)

/**
 * True when `item` can't render meaningfully offline — a network-only app
 * (YouTube, Web, Canva) that embeds live remote content. Images and videos are
 * always playable offline (served from the media cache), and data-backed apps
 * (weather, gcal) render their last-synced payload from the cached snapshot, so
 * both are never gated.
 */
export function itemRequiresNetwork(item: Renderable): boolean {
  return item.kind === 'app' && NETWORK_APP_SLUGS.has(item.slug)
}
