/**
 * The web side of the OTA updater: detection, apply, health signal, and the
 * policy for WHEN an update may be applied.
 *
 * The MECHANISM lives in Rust (`src-tauri/src/updater.rs`) — check, download
 * (signature-verified), install, restart, plus the post-update health watchdog
 * and rollback. This module owns the POLICY:
 *  - `checkForUpdate` — boot-time detection, reported to the CMS via the heartbeat.
 *  - `applyUpdateOrReload` — the nightly daily-reload window action.
 *  - `startStandbyUpdate` — catch-up: apply whenever the screen is dark (standby),
 *    which covers devices powered off or offline during the nightly window.
 *  - `reportHealthy` / `loadUpdateState` — the health handshake with the watchdog.
 *
 * Every entry point funnels through one guarded {@link runUpdate}, so the two
 * triggers can never double-download or race the Rust state file. Everything
 * no-ops in a plain browser (there is no native shell to update).
 */
import { effect } from '@preact/signals'

import { restartPlayer } from '../restart'
import { view } from '../store'
import type { DeviceUpdateStatus } from '../types'
import { hasNativeBridge, nativeInvoke } from './host'
import { getShellVersion, setApplyOutcome, setDetectionStatus } from './runtime'

/** Shape returned by the Rust `check_update` command (camelCase via serde). */
interface UpdateCheck {
  available: boolean
  currentVersion: string
  availableVersion?: string | null
  /**
   * Android only: an update is waiting but this device cannot install it without a
   * human confirming (off Device Owner and not its own installer of record). The
   * desktop shell never sends it, so it reads `undefined` and nothing changes.
   */
  needsOperator?: boolean
  /**
   * Android only: `'unreachable'` when the shell has not managed to read the update
   * channel for days. Distinct from "nothing newer" — and it used to be dropped
   * here, so a fleet-wide channel outage reported every screen as up to date.
   */
  channel?: string | null
  /** When the channel was last read successfully (epoch ms, 0 = never). */
  lastFetchAt?: number | null
  /** Why the last read failed — present only once one has actually been attempted. */
  lastFetchError?: string | null
}

/** Outcome of the native `run_update` command. */
interface RunResult {
  /**
   * `busy`           another apply is already in flight (the shell serializes them)
   * `unreachable`    the update channel could not be read — distinct from
   *                  `up-to-date`, which used to swallow it
   * `needs-operator` an update exists but Android will demand a human confirms it,
   *                  and this screen is unattended
   */
  kind:
    | 'updating'
    | 'up-to-date'
    | 'busy'
    | 'error'
    | 'unreachable'
    | 'needs-operator'
  version?: string | null
}

/** Native updater state read on boot (from the Rust `get_update_state`). */
interface UpdateStateReport {
  pendingVersion?: string | null
  lastResult?: DeviceUpdateStatus['lastResult'] | null
  /** True when the last boot rolled back a failed update. Conveyed to the CMS
   *  through `lastResult: 'unhealthy'` rather than a separate field. */
  rolledBack?: boolean | null
  currentVersion?: string
}

/**
 * Checks for a newer signed shell build and records the result in the reported
 * update status. Fire-and-forget at boot: it is never awaited on the connect
 * path, so a slow or unreachable endpoint can't delay the socket handshake —
 * the result rides out on a later heartbeat. No-op outside the native shell.
 */
export async function checkForUpdate(): Promise<void> {
  if (!hasNativeBridge()) {
    return
  }

  setDetectionStatus({
    lastResult: 'checking',
    currentVersion: getShellVersion(),
    lastCheckAt: new Date().toISOString(),
  })

  const result = await nativeInvoke<UpdateCheck>('check_update')
  const lastCheckAt = new Date().toISOString()

  // `nativeInvoke` swallows a rejected command to `undefined`; treat any failure
  // to reach or parse the endpoint as an error and stay on the current version,
  // rather than reporting a misleading "up to date".
  if (!result) {
    setDetectionStatus({
      lastResult: 'error',
      currentVersion: getShellVersion(),
      lastCheckAt,
    })
    return
  }

  const status: DeviceUpdateStatus = {
    currentVersion: result.currentVersion,
    lastCheckAt,
    lastResult: detectionResultFor(result),
    ...(result.availableVersion
      ? { availableVersion: result.availableVersion }
      : {}),
  }
  setDetectionStatus(status)
}

/**
 * What a detection check means for the fleet dashboard.
 *
 * Two things the shell says out loud used to be flattened into `up-to-date` here,
 * which is the answer an operator is least able to act on:
 *
 *  - `channel: 'unreachable'` — the update channel has not been readable for days.
 *    A wrong bucket URL or blocked egress made the whole fleet look healthy, which
 *    is exactly what the shell instrumented this marker to prevent.
 *  - `needsOperator` — an update IS waiting, but this device cannot take it
 *    unattended. Reporting that as plain `available` hides the site visit it needs.
 */
function detectionResultFor(
  result: UpdateCheck,
): NonNullable<DeviceUpdateStatus['lastResult']> {
  // "Stale" covers two very different things and only one is a fault. The shell
  // calls the channel stale when it has not read it for 48 h — which is equally true
  // of a screen that booted ten seconds ago and has not tried yet (`lastFetchAt` 0).
  // Since this check runs once per page load, reporting that as an error latched it
  // for the device's whole uptime: every freshly provisioned screen, and every screen
  // back from a long weekend, would show "Update error" while fetching perfectly well
  // seconds later. Report it only with evidence — a channel that once worked and has
  // gone quiet, or a fetch that actually failed.
  const everFetched = (result.lastFetchAt ?? 0) > 0
  if (result.channel === 'unreachable' && (everFetched || result.lastFetchError)) {
    return 'error'
  }
  if (!result.available) return 'up-to-date'
  return result.needsOperator ? 'needs-operator' : 'available'
}

/** True while an apply is already running — see {@link runUpdate}. */
let updateInFlight = false

/**
 * The single guarded path into the native `run_update`, shared by BOTH triggers
 * (nightly window and standby catch-up) so they can never double-download or
 * race the Rust state file. Rust serializes re-entrant calls too (returning
 * `busy`); this just avoids the pointless round-trip.
 *
 * Crucially it also REFLECTS the outcome into the reported update status: a
 * failed apply used to vanish silently, leaving the CMS showing a stale
 * "available" forever with no sign the device had tried and failed.
 */
async function runUpdate(operator = false): Promise<RunResult | undefined> {
  if (!hasNativeBridge()) {
    return undefined
  }
  // A concurrent apply already holds the guard (the nightly window and the
  // standby catch-up are independent triggers and can overlap). Report it as
  // `busy` — the same shape Rust returns — so the caller does NOT restart the
  // process out from under an in-flight download/install (which would abort it
  // and defer the update a day).
  if (updateInFlight) {
    return { kind: 'busy' }
  }
  updateInFlight = true

  const currentVersion = getShellVersion()
  setApplyOutcome({
    lastResult: 'checking',
    currentVersion,
    lastCheckAt: new Date().toISOString(),
  })

  try {
    // Unattended callers pass NO args at all rather than `{ operator: 'false' }` —
    // the shell's `flag("operator")` defaults to false either way, and an absent
    // argument keeps the wire shape identical to every non-operator call.
    const result = await nativeInvoke<RunResult>(
      'run_update',
      operator ? { operator: 'true' } : undefined,
    )

    // A successful install never returns here — the process restarts into the new
    // version — so anything we DO see is a non-install outcome. It is NOT necessarily
    // terminal, and reporting them all as `up-to-date` was actively misleading: a
    // download that had just started, an unreachable channel and a screen waiting for
    // a technician all showed the fleet a green tick.
    if (result?.kind !== 'busy') {
      setApplyOutcome({
        currentVersion,
        lastCheckAt: new Date().toISOString(),
        lastResult: applyResultFor(result),
        // Carry the target version. Now that `needs-operator` is sticky it WINS over
        // detection — and detection was the only slot holding `availableVersion`, so
        // without this the CMS would drop the "→ 0.1.8" suffix at exactly the moment
        // an operator needs to know which build is waiting for them.
        ...(result?.version ? { availableVersion: result.version } : {}),
      })
    }
    return result
  } finally {
    updateInFlight = false
  }
}

/**
 * What an apply attempt actually means for the fleet dashboard.
 *
 *  - `updating`       — the download has begun. The install either restarts us into
 *                       the new version or lands a terminal state via the shell, so
 *                       the honest interim answer is `installing`, not "done".
 *  - `needs-operator` — the device found an update it is not allowed to install
 *                       unattended (off Device Owner, Android insists a human
 *                       confirms the first one). A task for a person, not a fault.
 *  - `unreachable`    — the update channel could not be read at all. Silence here is
 *                       how a fleet-wide bucket misconfiguration stays invisible.
 *  - undefined        — the native command rejected; nativeInvoke swallows the reason.
 */
function applyResultFor(
  result: RunResult | undefined,
): NonNullable<DeviceUpdateStatus['lastResult']> {
  if (!result) return 'error'
  switch (result.kind) {
    case 'error':
    case 'unreachable':
      return 'error'
    case 'updating':
      return 'installing'
    case 'needs-operator':
      return 'needs-operator'
    default:
      return 'up-to-date'
  }
}

/**
 * Nightly maintenance action, wired as the daily-reload `onReload`: applies a
 * pending shell update if one exists (Rust installs and relaunches into it),
 * otherwise falls back to the normal player restart. No-op-to-reload in a plain
 * browser.
 */
export async function applyUpdateOrReload(): Promise<void> {
  const result = await runUpdate()
  // 'updating' means the shell is installing and relaunching itself; 'busy' means
  // a concurrent apply (standby catch-up) is already mid-flight and owns the
  // restart. In BOTH cases we must not restart, or we'd abort that in-flight
  // download/install. Anything else (no update, error, browser) still owes the
  // nightly content reload.
  if (result?.kind === 'updating' || result?.kind === 'busy') {
    return
  }
  restartPlayer()
}

/**
 * Applies a pending shell update if one is available — WITHOUT the reload
 * fallback of {@link applyUpdateOrReload}. Used off the nightly window (while
 * the screen is in standby), where there is nothing to reload if no update exists.
 *
 * [operator] is set ONLY by the CMS "Install now" command, where a person asked for
 * this screen by hand. The unattended callers below (standby, the six-hour backstop)
 * must leave it false, or a device that cannot install silently would raise a system
 * dialog with nobody there to answer it.
 */
export async function applyUpdateIfAvailable(operator = false): Promise<void> {
  await runUpdate(operator)
}

/**
 * Applies a pending update whenever the screen goes dark — standby / outside
 * working hours — including at boot for a device powered on before opening, and
 * at close-time. Installing + relaunching while the screen is already black
 * disrupts nothing, and this is the catch-up for devices that are powered off or
 * offline during the nightly reload window (which they'd otherwise miss for
 * another day). Returns a disposer. No-op in a plain browser (no native shell).
 */
export function startStandbyUpdate(): () => void {
  return effect(() => {
    if (view.value === 'standby') {
      void applyUpdateIfAvailable()
    }
  })
}

/** How often the maintenance backstop re-checks for a pending shell update. */
const MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6h

/**
 * A maintenance backstop that applies a pending shell update on a fixed cadence,
 * INDEPENDENT of content scheduling. Both other triggers ride content signals —
 * the nightly `applyUpdateOrReload` needs daily-reload enabled, and
 * {@link startStandbyUpdate} needs the screen to actually blank — so a 24/7
 * always-on screen with daily-reload off has neither and would detect updates at
 * boot yet never apply them, staying on an old/vulnerable shell forever. This
 * guarantees at least one apply path always exists. It no-ops on most ticks
 * (nothing pending) and, when it does apply, costs only the brief restart into
 * the new version — the unavoidable price of updating a screen that never idles.
 * Returns a disposer. No-op in a plain browser.
 */
export function startMaintenanceUpdates(): () => void {
  if (!hasNativeBridge()) {
    return () => undefined
  }
  const timer = setInterval(() => {
    void applyUpdateIfAvailable()
  }, MAINTENANCE_INTERVAL_MS)
  return () => clearInterval(timer)
}

/**
 * Tells the native shell the web JS is running (the WebView loaded the remote
 * page) — sent as early as possible, before connect/render. It is deliberately
 * distinct from {@link reportHealthy}: it lets the post-update watchdog tell a
 * build that broke the app (alive, but never healthy → roll back) from a device
 * that is simply offline so the remote page never loaded (not alive → defer,
 * because rolling back to a shell that loads the same URL can't help). Best-effort
 * and fire-and-forget: if it is dropped the watchdog just treats the boot as
 * offline and defers, which is the safe direction. No-op in a plain browser.
 */
export async function reportAlive(): Promise<void> {
  await nativeInvoke('report_alive')
}

/**
 * Tells the native shell that the web layer booted and reached a confirmed
 * working state — this clears the post-update health watchdog and promotes the
 * running version to last-known-good. No-op in a plain browser.
 *
 * This is the single most safety-critical signal in the system: if it never
 * lands, the watchdog rolls a perfectly good update back at `HEALTH_TIMEOUT`.
 * `nativeInvoke` swallows a transient IPC rejection to `undefined`, so a one-shot
 * fire-and-forget could be silently dropped — we retry with backoff, well inside
 * the 90 s watchdog window, so a momentary hiccup can't trigger a spurious
 * fleet-wide rollback.
 */
export async function reportHealthy(): Promise<void> {
  if (!hasNativeBridge()) {
    return
  }
  // The Rust command returns `()` (undefined) on success and — via nativeInvoke —
  // also `undefined` on a swallowed rejection, so the return can't tell them
  // apart. Confirm delivery out-of-band instead: get_update_state resolves iff
  // the IPC round-trip works, so a resolved probe means report_healthy landed too.
  const attempts = [0, 1000, 3000, 8000]
  for (const delay of attempts) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    await nativeInvoke('report_healthy')
    const probe = await nativeInvoke<UpdateStateReport>('get_update_state')
    if (probe !== undefined) {
      return // IPC is alive; report_healthy in the same channel landed.
    }
  }
}

/**
 * Reads the persisted native updater state on boot and reflects it into the
 * reported status, so a failed update or a rollback surfaces as `unhealthy` /
 * `error` in the CMS instead of being invisible. (Rust reconciles a stale
 * `installing` — an install that never took effect — into `error` before we get
 * here, so the CMS can never be stuck showing a phantom install.) No-op outside
 * the shell or when there is nothing to report.
 */
export async function loadUpdateState(): Promise<void> {
  const state = await nativeInvoke<UpdateStateReport>('get_update_state')
  if (!state?.lastResult) {
    return
  }
  setApplyOutcome({
    currentVersion: state.currentVersion ?? getShellVersion(),
    lastResult: state.lastResult,
    lastCheckAt: new Date().toISOString(),
  })
}
