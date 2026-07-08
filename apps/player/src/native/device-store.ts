/**
 * Native persistence of the stable `deviceId`. In the Tauri shell this reads/
 * writes a file in the app config dir (`%APPDATA%\<identifier>\device.json`),
 * which survives a WebView2 storage wipe AND a shell update — the failure mode
 * URL-based recovery cannot cover on a fixed-entry-URL native shell. No-ops in a
 * browser (returns undefined), where localStorage + the URL remain the anchors.
 */
import { nativeInvoke } from './tauri'

/** The deviceId persisted natively, or undefined (browser, absent, or error). */
export async function getNativeDeviceId(): Promise<string | undefined> {
  const id = await nativeInvoke<string | null>('get_device_id')
  return id ?? undefined
}

/** Persists the deviceId to the native store. No-op in a browser. */
export async function setNativeDeviceId(id: string): Promise<void> {
  await nativeInvoke('set_device_id', { id })
}
