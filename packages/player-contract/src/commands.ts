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
   *
   * `operator` says a human deliberately asked for THIS screen and can answer the
   * system's install confirmation. It matters only where the device cannot install
   * silently (off Device Owner, and not yet its own installer of record): without it
   * the shell refuses rather than throw a dialog at an empty room, and the screen
   * reports `needs-operator` instead. A fleet-wide rollout must NOT set it — dozens
   * of unanswerable dialogs is the outcome it exists to prevent. Ignored by the
   * desktop shell, which has no such restriction.
   */
  | { type: 'applyUpdate'; operator?: boolean }
  /**
   * Report back everything this screen knows about itself — cache state, storage,
   * and the shell's recent event log — as one `diagnostics` message on the socket.
   *
   * The remote equivalent of walking up to the screen and opening the service menu.
   * Pulled rather than pushed on every beat because the log is kilobytes and almost
   * always uninteresting: it is worth sending exactly when somebody asks.
   */
  | { type: 'sendDiagnostics' }
  // Transient playback nudges (remote next/prev, e.g. from the CMS preview).
  | { type: 'next' }
  | { type: 'prev' }

/** Backend-facing alias for the display + power settings payload. */
export type DeviceSettingsPayload = DeviceSettings
