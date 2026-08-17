import { APP_MANIFESTS } from '@signagewall/apps'

import type { AppRenderable, PlayerSnapshot } from '../types'

/**
 * Slugs of overlay apps that take over the WHOLE screen — the emergency alert —
 * as opposed to the ones that pin a band to an edge (the ticker). Derived from
 * the shared manifest registry so the set can never drift from the apps
 * themselves: flag an app by editing its manifest, not this file. Same pattern as
 * `engine/decoder-apps.ts` and `engine/network-apps.ts`.
 */
const TAKEOVER_SLUGS: ReadonlySet<string> = new Set(
  APP_MANIFESTS.filter((manifest) => manifest.takeover).map(
    (manifest) => manifest.slug,
  ),
)

export function isTakeoverOverlay(overlay: AppRenderable): boolean {
  return TAKEOVER_SLUGS.has(overlay.slug)
}

/**
 * The takeover currently on this screen, or undefined.
 *
 * The backend only puts one in the snapshot while its switch is on, so its mere
 * presence IS the emergency — the player never has to read the config to decide.
 * If an operator somehow has two live at once the first wins; a screen showing
 * one urgent message is right, a screen flickering between two is not.
 */
export function activeTakeover(
  snapshot: PlayerSnapshot | null,
): AppRenderable | undefined {
  return snapshot?.overlays?.find(isTakeoverOverlay)
}
