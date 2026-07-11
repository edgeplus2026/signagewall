/**
 * Boot-time bridge between the ASYNC native stores and the SYNCHRONOUS identity
 * ladder in `device.ts`. Must run before anything reads the deviceId (i.e.
 * before `getDeviceId()`/`connectPlayer()` in `app.tsx`), so the id the socket
 * sends is the recovered native one, not a freshly-minted UUID.
 */
import { readLocalDeviceId, seedDeviceId } from '../device'
import { getUrlDeviceId } from '../recovery'
import { getNativeDeviceId, setNativeDeviceId } from './device-store'
import { loadShellVersion } from './runtime'
import { isTauri } from './tauri'
import { checkForUpdate, loadUpdateState } from './updater'

/**
 * Resolves the device identity through the durability ladder
 * (native store → localStorage → URL → mint) and seeds it into the sync ladder.
 * No-op in a browser, where localStorage + the URL already govern identity.
 *
 * The key case is the FIRST boot after wrapping an already-paired device in the
 * shell: the native store is empty but localStorage holds the real id, so we
 * PROMOTE it into the native store — the device keeps its identity and never
 * re-pairs. Thereafter native wins, so a later WebView wipe recovers from it.
 */
export async function bootstrapNativeIdentity(): Promise<void> {
  if (!isTauri()) {
    return
  }

  const native = await getNativeDeviceId()
  if (native) {
    seedDeviceId(native)
    return
  }

  const local = readLocalDeviceId()
  if (local) {
    await setNativeDeviceId(local)
    seedDeviceId(local)
    return
  }

  const id = getUrlDeviceId() ?? crypto.randomUUID()
  await setNativeDeviceId(id)
  seedDeviceId(id)
}

/**
 * Loads native runtime facts (shell version) so the first heartbeat carries
 * them, then kicks off a one-shot OTA update check. The check is intentionally
 * detached (not awaited): its result only needs to reach a later heartbeat, so
 * a slow/unreachable update endpoint must never delay the connect path.
 */
export async function bootstrapNativeRuntime(): Promise<void> {
  if (!isTauri()) {
    return
  }
  await loadShellVersion()
  // Reflect a prior failed-update/rollback outcome into the reported status
  // before the first heartbeat, then kick off a fresh detection check.
  await loadUpdateState()
  void checkForUpdate()
}
