/**
 * The content contract resolved by the backend `PlayerContentService` and
 * rendered by the player engine. This is the single source of truth shared by
 * the backend (snapshot producer) and the player (snapshot consumer).
 */

import type { AvailabilityRule } from './availability.js'

export interface ImageRenderable {
  id: string
/**
 * WHAT is playing, as opposed to where it sits in a playlist.
 *
 * `id` identifies the SLOT — the screen item or playlist entry — and it changes
 * whenever an operator removes and re-adds a piece of content, or moves it
 * between playlists. That makes it useless for reporting: the same advert would
 * split into several rows and every one of them would show a fraction of its real
 * play count.
 *
 * `contentId` is the media item or app instance itself, and survives all of that.
 * Proof-of-play aggregates on it. Optional because a player older than the field
 * simply reports the slot id instead: the report still works, it is only less
 * stable across playlist edits.
 */
  contentId?: string
  kind: 'image'
  url: string
  durationMs: number
  width?: number
  height?: number
}

export interface VideoRenderable {
  id: string
  /** The media item itself, not the slot. See {@link ImageRenderable.contentId}. */
  contentId?: string
  kind: 'video'
  url: string
  durationMs: number
  mimeType?: string
  width?: number
  height?: number
}

export interface AppRenderable {
  id: string
  /** The app instance itself, not the slot. See {@link ImageRenderable.contentId}. */
  contentId?: string
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
