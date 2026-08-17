/**
 * The native shell's own channel to the backend — a path that does not go through
 * the web page.
 *
 * Everything else a screen says travels through the player page: the heartbeat,
 * the diagnostics, the commands. That is fine until the page is the thing that
 * broke. A bad web deploy, a WebView that will not load, a renderer that keeps
 * dying — and the screen goes silent while the shell underneath is running
 * perfectly and would happily tell you so.
 *
 * So the shell polls. Not a socket: this is the layer that has to work when
 * nothing else does, and a request the shell makes on a timer has no connection
 * to lose, no reconnect logic to get wrong, and no library to keep alive. The
 * cost is latency — a command waits up to one interval — which is the right
 * trade for "the screen is dark and I need it back", and the wrong one for
 * anything the page can already do faster.
 *
 * PLATFORM SUPPORT: implemented by the ANDROID shell only. The desktop (Tauri)
 * shell answers neither `set_channel` nor the commands this channel dispatches,
 * so a desktop screen whose page will not load stays silent — the failure this
 * exists to reveal. Stated here rather than left to be discovered, because the
 * shapes below read as cross-platform and nothing else says otherwise. The same
 * gap covers `device_info`, `free_disk`, `health`, `read_log`,
 * `set_web_debugging`, `deactivate`, `device_owner` and
 * `request_recovery_permission`: all Android-only today, all silently resolving
 * `undefined` on desktop.
 */

/** What the shell tells the backend about itself, on its own schedule. */
export interface ShellStatusReport {
  /** Native shell version, distinct from the web bundle's `appVersion`. */
  shellVersion?: string
  /**
   * Whether the web page is running at all, as the shell sees it.
   *
   * The reason this channel exists. `false` here with a shell that is plainly
   * alive is the fingerprint of a broken web deploy — a state the page itself
   * can never report, because reporting it is the thing it cannot do.
   */
  pageAlive?: boolean
  /** How many times the shell has had to put the player back on screen. */
  recoveries?: number
  /** Breadcrumb from the last uncaught crash, and when it happened. */
  lastCrash?: string
  lastCrashAt?: number
  /** Free bytes on the device's data partition. */
  freeDiskBytes?: number
  /** The shell's recent events, sent only when the backend asked for them. */
  log?: string[]
}

/**
 * What the shell may be told to do. A deliberately short list: this path is
 * reached when something is already wrong, and every entry has to be safe to
 * run on a screen whose actual state nobody knows.
 */
export type ShellCommand =
  /** Restart the app process — the shell's own recovery, not the page's. */
  | 'restart'
  /** Reload the page without restarting the process. The gentler option. */
  | 'reload'
  /** Install a pending update now. */
  | 'applyUpdate'

export const SHELL_COMMANDS: readonly ShellCommand[] = [
  'restart',
  'reload',
  'applyUpdate',
]

export function isShellCommand(value: unknown): value is ShellCommand {
  return (
    typeof value === 'string' && (SHELL_COMMANDS as string[]).includes(value)
  )
}

/** The backend's answer to a status report. */
export interface ShellStatusResponse {
  /**
   * Commands to run now. Handed over once and then forgotten by the backend, so
   * a device that takes one and dies before running it does not get it again —
   * the alternative is a queued `restart` that re-fires on every boot forever.
   */
  commands: ShellCommand[]
  /**
   * Whether to include the event log in the next report. Asked for rather than
   * always sent: it is kilobytes, and on this channel it is being carried by the
   * device that is already in trouble.
   */
  wantsLog?: boolean
}
