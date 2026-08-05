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
   * `data` so it can flag stale data on screen, and so an app can pin the payload
   * to a real instant (the weather bundle derives the forecast place's local clock
   * from it). Absent for `static` apps.
   */
  dataMeta?: {
    /** ISO time `data` was last successfully fetched, if ever. */
    fetchedAt?: string
    /** True while an asynchronous connector job is still in progress. */
    pending?: boolean
    /** True when the latest fetch failed (`data` is last-known-good). */
    stale?: boolean
  }
}

export type Renderable = ImageRenderable | VideoRenderable | AppRenderable

export interface PlayerSnapshot {
  screenId: string
  name: string
  revision: string
  items: Renderable[]
  /**
   * Working-hours rule the player evaluates locally (standby scheduling).
   * Absent ⇒ always on.
   */
  availability?: AvailabilityRule
  /**
   * Persistent overlay apps (manifest `overlay: true`, e.g. the ticker band)
   * assigned to this screen. Drawn above the stage for as long as the snapshot
   * carries them — they never occupy a rotation slot. `durationMs` is
   * meaningless here and set to 0.
   */
  overlays?: AppRenderable[]
}
