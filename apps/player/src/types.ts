/**
 * Player-side mirror of the backend `PlayerContentService` snapshot contract.
 * Kept in lockstep with `apps/be/src/modules/player/player-content.service.ts`.
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

/** Server→player Socket.IO event payloads. */
export interface PairingCodePayload {
  code: string
  expiresAt: string
}

export interface PairedPayload {
  screenId: string
  token?: string
  /** Current playback volume 0–100 to apply on connect. */
  volume?: number
}

/** Live control command pushed to this device. */
export type PlayerCommand = { type: 'volume'; value: number }

export type ConnectionState =
  | 'connecting'
  | 'online'
  | 'offline'
  | 'reconnecting'
