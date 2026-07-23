/**
 * Native persistence of the stable `deviceId`. In the Tauri shell this reads/
 * writes a file in the app config dir (`%APPDATA%\<identifier>\device.json`),
 * which survives a WebView2 storage wipe AND a shell update — the failure mode
 * URL-based recovery cannot cover on a fixed-entry-URL native shell. No-ops in a
 * browser (returns undefined), where localStorage + the URL remain the anchors.
 */
import { nativeInvoke, nativeInvokeStrict } from './host'

/** Bound on the native identity read so a stuck config disk can't wedge boot. */
const READ_TIMEOUT_MS = 5000

/**
 * Outcome of reading the native identity store. `unreadable` is deliberately
 * distinct from `absent`: a failed read (IO error, corrupt file, hung IPC) may
 * mean the store STILL holds the real id, so the caller must not treat it as
 * "empty" and overwrite it with a freshly-minted one — that would permanently
 * strand a paired screen.
 */
export type NativeDeviceRead =
  | { status: 'present'; id: string }
  | { status: 'absent' }
  | { status: 'unreadable' }

/**
 * Reads the natively-persisted deviceId, distinguishing present / absent /
 * unreadable. No-op-ish in a browser: there is no native store, so it reports
 * `absent` (the ladder then falls through to localStorage + the URL).
 */
export async function readNativeDeviceId(): Promise<NativeDeviceRead> {
  try {
    const id = await nativeInvokeStrict<string | null>(
      'get_device_id',
      undefined,
      READ_TIMEOUT_MS,
    )
    return id ? { status: 'present', id } : { status: 'absent' }
  } catch {
    return { status: 'unreadable' }
  }
}

/** Persists the deviceId to the native store. No-op in a browser. */
export async function setNativeDeviceId(id: string): Promise<void> {
  await nativeInvoke('set_device_id', { id })
}
