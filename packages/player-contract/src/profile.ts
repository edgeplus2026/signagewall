/**
 * The device profile a player reports to the backend (on connect + every
 * heartbeat) and the shell/OTA update status derived from it. Single source of
 * truth shared by the player (producer), the backend (Mongoose subdoc + REST
 * DTO), and the CMS (device tab) — previously this shape was hand-duplicated in
 * all three. Add a reported field once, here.
 */

/** Where the player runs, as reported by the native shell (or 'browser'). */
export type PlayerRuntime =
  | 'tauri'
  | 'electron'
  | 'android-webview'
  | 'browser'

/** Progress of the native-shell OTA updater, surfaced to operators in the CMS. */
export interface DeviceUpdateStatus {
  /** Native shell version currently running. */
  currentVersion?: string
  /** Version available on the update channel, if newer than current. */
  availableVersion?: string
  /** ISO timestamp of the last update check. */
  lastCheckAt?: string
  lastResult?:
    | 'idle'
    | 'checking'
    | 'up-to-date'
    /** A newer signed build exists on the channel but hasn't been downloaded yet. */
    | 'available'
    | 'downloading'
    | 'ready'
    | 'installing'
    | 'error'
    | 'unhealthy'
}

/**
 * What a device reports about itself. The first five fields are the original
 * web-only profile; the rest are added by the native (Tauri) shell and are
 * absent in a plain browser. `appVersion` is the WEB bundle version;
 * `shellVersion` is the distinct native-shell version — never conflate them.
 */
export interface ReportedProfile {
  platform?: string
  userAgent?: string
  /** Web (PWA) bundle version. */
  appVersion?: string
  screenWidth?: number
  screenHeight?: number
  /** Native shell version (Tauri). Absent in a browser. */
  shellVersion?: string
  /** Runtime host the player detected. */
  runtime?: PlayerRuntime
  /** Native-shell OTA update status. Absent in a browser. */
  updateStatus?: DeviceUpdateStatus
}
