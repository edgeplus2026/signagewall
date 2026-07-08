/**
 * Boot-time OTA update *detection* (Phase 2). Calls the native `check_update`
 * Rust command — which hits `plugins.updater.endpoints` — and folds the outcome
 * into the reported update status, so the next heartbeat and the CMS device tab
 * reflect whether a newer signed shell build is available.
 *
 * Detection only: downloading, installing, off-hours gating, and relaunch land
 * in a later phase. No-op in a plain browser (there is no native shell to update).
 */
import type { DeviceUpdateStatus } from '../types'
import { getShellVersion, setUpdateStatus } from './runtime'
import { isTauri, nativeInvoke } from './tauri'

/** Shape returned by the Rust `check_update` command (camelCase via serde). */
interface UpdateCheck {
  available: boolean
  currentVersion: string
  availableVersion?: string | null
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
