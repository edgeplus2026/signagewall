/**
 * The content contract resolved by the backend `PlayerContentService` and
 * rendered by the player engine. This is the single source of truth shared by
 * the backend (snapshot producer) and the player (snapshot consumer).
 */

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
}

export type Renderable = ImageRenderable | VideoRenderable | AppRenderable

export interface PlayerSnapshot {
  screenId: string
  name: string
  revision: string
  items: Renderable[]
}
