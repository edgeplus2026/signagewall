import type {
  DailyReloadSetting,
  DeviceOrientation,
  DeviceScale,
  DeviceSettings,
} from './settings.js'

/** Server→player pairing-code payload (shown while unpaired). */
export interface PairingCodePayload {
  code: string
  expiresAt: string
}

/** Server→player payload delivered on pair / paired reconnect. */
export interface PairedPayload {
  screenId: string
  /** Present only when a token was (re)issued and must be persisted client-side. */
  token?: string
  /** Current playback volume 0–100 to apply on connect. */
  volume?: number
  /** Display + power settings to apply on connect. */
  settings?: DeviceSettings
}

/**
 * Live control command pushed to one device's socket (and mirrored to any CMS
 * preview spectators in the same screen room). Single source of truth for both
 * the backend emitter and the player handler.
 */
export type PlayerCommand =
  | { type: 'volume'; value: number }
  | { type: 'orientation'; value: DeviceOrientation }
  | { type: 'scale'; value: DeviceScale }
  | { type: 'restart' }
  | { type: 'dailyReload'; value: DailyReloadSetting }
  /**
   * Install a pending shell update NOW, instead of waiting for the device's own
   * windows (standby, the nightly reload, or the six-hour backstop). Exists for
   * one situation: a build shipped with a fault, and every hour it stays on the
   * fleet is an hour of broken screens. It only ever moves FORWARD to whatever
   * the update channel currently offers — there is no command that undoes a
   * release, so the fix is always a higher version.
   */
  | { type: 'applyUpdate' }
  // Transient playback nudges (remote next/prev, e.g. from the CMS preview).
  | { type: 'next' }
  | { type: 'prev' }

/** Backend-facing alias for the display + power settings payload. */
export type DeviceSettingsPayload = DeviceSettings
