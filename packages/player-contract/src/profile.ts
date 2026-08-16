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
 * What a screen is doing right now, as opposed to what it IS.
 *
 * Exists so a fault can be read from the dashboard instead of reconstructed from
 * the outside. Every field here was, at some point, something someone had to
 * infer: whether a clip was cached had to be guessed from free-disk deltas over
 * adb, and whether the service worker had taken over was invisible entirely —
 * while an uncontrolled page caches nothing at all and looks perfectly healthy.
 *
 * Every field is optional. A player too old to report one, or a browser with no
 * shell to ask, simply omits it, and the CMS shows nothing rather than a zero
 * that reads as a fault.
 */
export interface PlayerDiagnostics {
  /** Media URLs the worker's cache holds, out of {@link totalMedia}. */
  cachedMedia?: number
  /** Media URLs in the current snapshot. */
  totalMedia?: number
  /**
   * Whether the last warm-up pass reached the end with everything stored. False
   * with a full `cachedMedia` means a pass is still running or was interrupted —
   * the distinction that decides whether this screen would survive going offline.
   */
  cacheComplete?: boolean
  /** Free bytes on the device's data partition. Absent off a native shell. */
  freeDiskBytes?: number
  /**
   * Whether a service worker actually CONTROLS the page. False means nothing is
   * being cached no matter what else looks right — the failure that once left a
   * field device with an empty video cache after a full rotation.
   */
  serviceWorkerControlled?: boolean
  /**
   * How many times the shell has had to put the player back on screen since
   * install. Counted rather than sampled: the recovery ladder resets when it
   * settles, so a screen that struggled all night looks identical to a healthy
   * one by morning. A number that only climbs is the only way that shows up.
   */
  recoveries?: number
  /** Breadcrumb from the last uncaught crash, if there has ever been one. */
  lastCrash?: string
  /** When that crash happened (epoch ms, by the device's clock). */
  lastCrashAt?: number
}

/**
 * The on-demand report a device sends when the CMS asks — everything in
 * {@link PlayerDiagnostics}, plus the shell's recent events.
 */
export interface DiagnosticsReport extends PlayerDiagnostics {
  /** The shell's rolling event log, oldest first. Absent off a native shell. */
  log?: string[]
  /** When the device assembled the report, by its own clock (ISO 8601). */
  at?: string
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
   * Live health of this screen. Grouped rather than flattened into the profile
   * because the fields around it are stable facts about the box, while these
   * change on every beat — and something that reads "model" and "cached 4 of 20"
   * as the same kind of thing invites treating a stale one as current.
   */
  diagnostics?: PlayerDiagnostics
  /**
   * Android only: whether the shell is provisioned as Device Owner. A kiosk lock
   * can only actually hold when this is true — otherwise the shell degrades the
   * request to escapable screen-pinning. Reported for fleet visibility; the
   * technician-facing warning lives in the player's own service menu, next to the
   * switch it qualifies. Absent where the question does not apply (a browser, the
   * desktop shell) or on a shell too old to answer it.
   */
  deviceOwner?: boolean
}
