/**
 * Module-level cache of native-shell runtime facts that `getProfile()` reports
 * synchronously (the heartbeat can't await). The boot bootstrap loads the shell
 * version once; the OTA updater (later) pushes update status here. All getters
 * return undefined in a browser, so the reported profile stays web-only there.
 */
import type { DeviceUpdateStatus } from '../types'
import { nativeInvoke } from './tauri'

let shellVersion: string | undefined
let updateStatus: DeviceUpdateStatus | undefined

/** Loads the native shell version into the cache (once, at boot). */
export async function loadShellVersion(): Promise<void> {
  shellVersion = await nativeInvoke<string>('shell_version')
}

/** Native shell version, or undefined in a browser. */
export function getShellVersion(): string | undefined {
  return shellVersion
}

/** Latest OTA update status, or undefined when the updater hasn't run. */
export function getUpdateStatus(): DeviceUpdateStatus | undefined {
  return updateStatus
}

/** Records the current OTA update status so the next heartbeat carries it. */
export function setUpdateStatus(next: DeviceUpdateStatus): void {
  updateStatus = next
}
