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
import { getShellVersion, setUpdateStatus } from './runtime'
import { isTauri, nativeInvoke } from './tauri'

/** Shape returned by the Rust `check_update` command (camelCase via serde). */
interface UpdateCheck {
  available: boolean
  currentVersion: string
  availableVersion?: string | null
}

/** Outcome of the native `run_update` command. */
interface RunResult {
  /** `busy` = another apply is already in flight (Rust serializes them). */
  kind: 'updating' | 'up-to-date' | 'busy' | 'error'
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
  if (!isTauri()) {
    return
  }

  setUpdateStatus({
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
    setUpdateStatus({
      lastResult: 'error',
      currentVersion: getShellVersion(),
      lastCheckAt,
    })
    return
  }

  const status: DeviceUpdateStatus = {
    currentVersion: result.currentVersion,
    lastCheckAt,
    lastResult: result.available ? 'available' : 'up-to-date',
    ...(result.availableVersion
      ? { availableVersion: result.availableVersion }
      : {}),
  }
  setUpdateStatus(status)
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
async function runUpdate(): Promise<RunResult | undefined> {
  if (!isTauri() || updateInFlight) {
    return undefined
  }
  updateInFlight = true

  const currentVersion = getShellVersion()
  setUpdateStatus({
    lastResult: 'checking',
    currentVersion,
    lastCheckAt: new Date().toISOString(),
  })

  try {
    const result = await nativeInvoke<RunResult>('run_update')

    // A successful install never returns here — the process restarts into the
    // new version — so anything we DO see is a terminal non-install outcome.
    if (result?.kind !== 'busy') {
      setUpdateStatus({
        currentVersion,
        lastCheckAt: new Date().toISOString(),
        // undefined = the Rust command rejected (nativeInvoke swallows it).
        lastResult: !result || result.kind === 'error' ? 'error' : 'up-to-date',
      })
    }
    return result
  } finally {
    updateInFlight = false
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
  // 'updating' means the shell is installing and relaunching itself — we must
  // not also restart. Anything else (no update, error, busy, browser) still owes
  // the nightly content reload.
  if (result?.kind === 'updating') {
    return
  }
  restartPlayer()
}

/**
 * Applies a pending shell update if one is available — WITHOUT the reload
 * fallback of {@link applyUpdateOrReload}. Used off the nightly window (while
 * the screen is in standby), where there is nothing to reload if no update exists.
 */
export async function applyUpdateIfAvailable(): Promise<void> {
  await runUpdate()
}

/**
 * Applies a pending update whenever the screen goes dark — standby / outside
 * working hours — including at boot for a device powered on before opening, and
 * at close-time. Installing + relaunching while the screen is already black
 * disrupts nothing, and this is the catch-up for devices that are powered off or
 * offline during the nightly reload window (which they'd otherwise miss for
 * another day). Returns a disposer. No-op in a plain browser (never Tauri).
 */
export function startStandbyUpdate(): () => void {
  return effect(() => {
    if (view.value === 'standby') {
      void applyUpdateIfAvailable()
    }
  })
}

/**
 * Tells the native shell that the web layer booted and rendered successfully —
 * this clears the post-update health watchdog and promotes the running version
 * to last-known-good. No-op in a plain browser.
 */
export async function reportHealthy(): Promise<void> {
  await nativeInvoke('report_healthy')
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
  setUpdateStatus({
    currentVersion: state.currentVersion ?? getShellVersion(),
    lastResult: state.lastResult,
    lastCheckAt: new Date().toISOString(),
  })
}
