/**
 * The device profile a player reports to the backend (on connect + every
 * heartbeat) and the shell/OTA update status derived from it. Single source of
 * truth shared by the player (producer), the backend (Mongoose subdoc + REST
 * DTO), and the CMS (device tab) — previously this shape was hand-duplicated in
 * all three. Add a reported field once, here.
 */

/**
 * Where the player runs, as reported by the native shell (or derived from the
 * userAgent). `webos` is an LG TV or signage display: it has no native bridge,
 * so it behaves like `browser` everywhere in the code — it is reported
 * separately only so the fleet is legible, since those displays have their own
 * failure modes (one video decode session, no service worker when packaged, no
 * wake lock) and "browser" hides which screens they are.
 */
export type PlayerRuntime =
  | 'tauri'
  | 'electron'
  | 'android-webview'
  | 'webos'
  | 'browser'

/** Progress of the native-shell OTA updater, surfaced to operators in the CMS. */
export interface DeviceUpdateStatus {
  /** Native shell version currently running. */
  currentVersion?: string
  /** Version available on the update channel, if newer than current. */
  availableVersion?: string
  /** ISO timestamp of the last update check. */
  lastCheckAt?: string
  /**
   * Every member here is actually emitted — `checking`/`available`/`up-to-date`/
   * `error` by the web layer, `installing`/`unhealthy` by the native updater.
   * Don't add a state until something produces it: a state the fleet can never
   * report is a lie the CMS tells the operator.
   */
  lastResult?:
    | 'idle'
    | 'checking'
    /** A newer signed build exists on the channel but hasn't been applied yet. */
    | 'available'
    | 'up-to-date'
    /** Downloaded and being installed; the shell restarts out of this state. */
    | 'installing'
    | 'error'
    /** A freshly-installed version failed its health check (and was rolled back). */
    | 'unhealthy'
    /**
     * An update exists, but Android will not install it without a human pressing
     * confirm — the normal state of a sideloaded, non-Device-Owner box before its
     * first self-update. A task for a technician, not a fault, and worth its own
     * state precisely so the fleet dashboard can list them rather than showing a
     * green tick on screens that are quietly stuck a version behind.
     */
    | 'needs-operator'
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
  /**
   * Android only: whether the shell is provisioned as Device Owner. A `hard`
   * kiosk lock can only actually hold when this is true — otherwise the shell
   * degrades the request to escapable screen-pinning, so the CMS must not keep
   * calling that screen "fully locked". Absent where the question does not apply
   * (a browser, the desktop shell) or on a shell too old to answer it.
   */
  deviceOwner?: boolean
}
