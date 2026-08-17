/**
 * Module-level cache of native-shell runtime facts that `getProfile()` reports
 * synchronously (the heartbeat can't await). The boot bootstrap loads the shell
 * version once; the OTA updater (later) pushes update status here. All getters
 * return undefined in a browser, so the reported profile stays web-only there.
 */
import type { DeviceUpdateStatus } from '../types'
import { nativeInvoke } from './host'

type UpdateResult = NonNullable<DeviceUpdateStatus['lastResult']>

let shellVersion: string | undefined

/**
 * Whether the Android shell is provisioned as Device Owner. Only then can a
 * `hard` kiosk lock actually hold — without it the shell silently degrades the
 * request to escapable screen-pinning, and an operator reading "fully locked" in
 * the CMS would be wrong about the one thing that setting promises. Undefined off
 * the Android shell, where the question does not apply.
 */
let deviceOwner: boolean | undefined

/**
 * Two DISTINCT facts, deliberately not one slot: a routine detection check
 * (`checking`/`available`/`up-to-date`, or an endpoint `error`) must never hide a
 * native APPLY outcome the operator has to act on — an `unhealthy` rollback or an
 * in-progress `installing`. Before this split a boot's `checkForUpdate` clobbered
 * the `unhealthy` that `loadUpdateState` had just surfaced, so a rolled-back
 * device reported `up-to-date` and the CMS attention badge never lit.
 */
let detection: DeviceUpdateStatus | undefined
let applyOutcome: DeviceUpdateStatus | undefined

/**
 * Apply outcomes that must survive a routine detection check until the next apply
 * supersedes them (or a successful install restarts the process). `error` here is
 * an *apply* failure, distinct from a transient detection `error` (which stays in
 * `detection` and clears on the next successful check).
 */
const STICKY_APPLY: ReadonlySet<UpdateResult> = new Set([
  'installing',
  'unhealthy',
  'error',
])

/** Loads the native shell version into the cache (once, at boot). */
export async function loadShellVersion(): Promise<void> {
  shellVersion = await nativeInvoke<string>('shell_version')
}

/** Native shell version, or undefined in a browser. */
export function getShellVersion(): string | undefined {
  return shellVersion
}

/**
 * Loads the Device Owner flag (once, at boot). Older shells don't answer the
 * command; `nativeInvoke` resolves undefined there, which reads as "unknown" and
 * the CMS simply says nothing — better than claiming a fleet is unprovisioned
 * because it runs last month's APK.
 */
export async function loadDeviceOwner(): Promise<void> {
  deviceOwner = await nativeInvoke<boolean>('device_owner')
}

/** True/false on the Android shell; undefined elsewhere or on an older shell. */
export function isDeviceOwner(): boolean | undefined {
  return deviceOwner
}

/**
 * Free bytes on the device's data partition, or undefined where nothing can say —
 * a browser, the desktop shell, or an Android shell too old for the command.
 *
 * Deliberately NOT cached like the two above: free space is the one device fact
 * that changes while the player runs, and a value read at boot would be the exact
 * value that stops being true as the cache fills.
 *
 * The shell answers -1 when the OS refused to measure. That is "unknown", not
 * "nothing left" — treating it as zero would stop caching on a healthy device.
 */
export async function freeDiskBytes(): Promise<number | undefined> {
  const bytes = await nativeInvoke<number>('free_disk')
  return typeof bytes === 'number' && bytes >= 0 ? bytes : undefined
}

/** What the shell reports about how hard it has been working. */
export interface ShellHealth {
  recoveries?: number
  lastCrash?: string
  lastCrashAt?: number
}

/**
 * How hard this screen has been struggling, or undefined off a native shell.
 *
 * Read fresh on every heartbeat rather than cached: a recovery count that only
 * updated at boot would be zero on exactly the device that had been recovering
 * all night.
 */
export async function shellHealth(): Promise<ShellHealth | undefined> {
  return nativeInvoke<ShellHealth>('health')
}

/**
 * Composed OTA status for the heartbeat. An unresolved apply outcome (a rollback
 * awaiting operator action) wins over routine detection, so a rolled-back device
 * surfaces `unhealthy` in the CMS instead of a misleading `available`.
 */
export function getUpdateStatus(): DeviceUpdateStatus | undefined {
  if (applyOutcome?.lastResult && STICKY_APPLY.has(applyOutcome.lastResult)) {
    return applyOutcome
  }
  return detection ?? applyOutcome
}

/** Records a routine detection result (from `checkForUpdate`). */
export function setDetectionStatus(next: DeviceUpdateStatus): void {
  detection = next
}

/** Records a native apply/boot outcome (`loadUpdateState`, `runUpdate`). */
export function setApplyOutcome(next: DeviceUpdateStatus): void {
  applyOutcome = next
}
