/**
 * The content contract resolved by the backend `PlayerContentService` and
 * rendered by the player engine. This is the single source of truth shared by
 * the backend (snapshot producer) and the player (snapshot consumer).
 */

import type { AvailabilityRule } from './availability.js'

export interface ImageRenderable {
  id: string
  kind: 'image'
  url: string
  durationMs: number
  width?: number
  height?: number
}

export interface VideoRenderable {
  id: string
  kind: 'video'
  url: string
  durationMs: number
  mimeType?: string
  width?: number
  height?: number
}

export interface AppRenderable {
  id: string
  kind: 'app'
  slug: string
  config: Record<string, unknown>
  durationMs: number
  /**
   * Normalized connector payload handed to the app over the postMessage
   * handshake. `null`/absent for `static` apps and for any `server` app before
   * its first successful fetch.
   */
  data?: unknown
  /**
   * Freshness metadata for `server`-app payloads, handed to the bundle alongside
   * `data` so it can show an honest "as of …" age and flag stale data. Absent
   * for `static` apps.
   */
  dataMeta?: {
    /** ISO time `data` was last successfully fetched, if ever. */
    fetchedAt?: string
    /** True when the latest fetch failed (`data` is last-known-good). */
    stale?: boolean
  }
}

export type Renderable = ImageRenderable | VideoRenderable | AppRenderable

/**
 * Split-screen layout presets. Geometry is owned by the player's CSS (keyed on
 * the preset), so the wire carries a name, not rectangles. `fullscreen` (or an
 * absent `layout`) is the classic single-region screen.
 */
export type ScreenLayoutPreset =
  | 'fullscreen'
  | 'main-sidebar'
  | 'main-ticker'
  | 'main-sidebar-ticker'

/** The additional regions a preset can have; `main` is `PlayerSnapshot.items`. */
export type ScreenZoneKey = 'sidebar' | 'ticker'

/** One secondary region's resolved rotation. */
export interface SnapshotZone {
  key: ScreenZoneKey
  items: Renderable[]
}

export interface PlayerSnapshot {
  screenId: string
  name: string
  revision: string
  /**
   * The MAIN zone's rotation. Deliberately keeps its historical name/shape so a
   * player that predates split-screen still plays the main content fullscreen.
   */
  items: Renderable[]
  /**
   * Split-screen: the layout preset and the secondary zones' rotations. Absent
   * (legacy screens, or preset `fullscreen`) ⇒ single-region playback. The
   * player only draws the zones its preset defines; audio belongs to the main
   * zone alone — secondary zones always play muted.
   */
  layout?: ScreenLayoutPreset
  zones?: SnapshotZone[]
  /**
   * Working-hours rule the player evaluates locally (standby scheduling).
   * Absent ⇒ always on.
   */
  availability?: AvailabilityRule
}
