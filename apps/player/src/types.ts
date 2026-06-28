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

/** Mirror of the backend `DeviceOrientation` enum. */
export type DeviceOrientation =
  | 'landscape'
  | 'landscape-flipped'
  | 'portrait'
  | 'portrait-flipped'

/** Mirror of the backend `DeviceScale` enum (maps to CSS object-fit). */
export type DeviceScale = 'none' | 'fit' | 'stretch' | 'zoom'

/** Automatic once-a-day reload, in the device's local time. */
export interface DailyReloadSetting {
  enabled: boolean
  /** 24h 'HH:mm' in the device's local timezone. */
  time: string
}

/** Display + power settings pushed from the CMS (mirrors `DeviceSettings`). */
export interface DeviceSettings {
  orientation: DeviceOrientation
  scale: DeviceScale
  dailyReload: DailyReloadSetting
}

export interface PairedPayload {
  screenId: string
  token?: string
  /** Current playback volume 0–100 to apply on connect. */
  volume?: number
  /** Display + power settings to apply on connect. */
  settings?: DeviceSettings
}

/** Live control command pushed to this device. Lockstep with the backend. */
export type PlayerCommand =
  | { type: 'volume'; value: number }
  | { type: 'orientation'; value: DeviceOrientation }
  | { type: 'scale'; value: DeviceScale }
  | { type: 'restart' }
  | { type: 'dailyReload'; value: DailyReloadSetting }
  // Transient playback nudges (remote next/prev, e.g. from the CMS preview).
  | { type: 'next' }
  | { type: 'prev' }

export type ConnectionState =
  | 'connecting'
  | 'online'
  | 'offline'
  | 'reconnecting'
