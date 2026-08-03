/**
 * The on-device service menu's link to the native shell.
 *
 * Everything the menu shows about the *device* (Android build, model, whether
 * the box is provisioned as Device Owner) is knowledge only the shell has — the
 * page cannot read it — so it comes over the bridge in one `device_info` call
 * rather than one round-trip per field. Everything the menu shows about the
 * *screen* (name, id, player version) already lives in the web layer and is read
 * from the store directly.
 *
 * Both actions degrade honestly off Android: `closeApp` reports that nothing
 * happened (a browser tab cannot close itself), and `deactivate` still performs
 * the full web-side wipe, so a browser-based display unpairs correctly even
 * though there is no native identity store to drop.
 */
import { clearCachedPairingCode, clearLocalDeviceId, clearToken } from '../device'
import { clearMediaCaches, clearSnapshot } from '../persistence/idb'
import { hasNativeBridge, nativeInvoke } from './host'

/**
 * Whether this player is allowed to show the service menu at all.
 *
 * The menu belongs to a player that IS the device: an Android box or the desktop
 * shell, where there is a kiosk to unlock, an app to close, and a screen someone
 * services in person. A plain browser tab is none of those — the "device" is
 * somebody's laptop or phone, every action on the bar is either meaningless or
 * actively wrong there, and UP is a key the page has no business claiming. So in
 * a browser the menu is not merely hidden: it never listens for the key that
 * opens it.
 *
 * Read live rather than cached at boot, so a shell that injects its bridge after
 * the bundle loads still gets its menu.
 */
export function isServiceMenuAvailable(): boolean {
  return hasNativeBridge()
}

/** Device facts the shell reports for the service menu. All optional: an older
 *  shell that predates `device_info` answers nothing, and the menu shows "—"
 *  rather than claiming a fleet is unprovisioned because it runs last month's APK. */
export interface ShellDeviceInfo {
  androidRelease?: string
  androidSdk?: number
  model?: string
  shellVersion?: string
  kioskMode?: string
  deviceOwner?: boolean
  /**
   * Whether Android will let the shell put the player back on screen after
   * something knocks it off. False means the display is one firmware hiccup away
   * from sitting on the TV's menu until a person walks over — measured in the
   * field: a codec crash took the player off and 63 consecutive recovery attempts
   * were refused. Undefined on a shell too old to report it.
   */
  canRecover?: boolean
}

/**
 * Reads the shell's device facts, or undefined in a browser / on a shell too old
 * to answer. Bounded by a short timeout: the menu must open instantly even if the
 * bridge is wedged, so the caller renders first and fills these in when they land.
 */
export async function loadShellDeviceInfo(): Promise<ShellDeviceInfo | undefined> {
  return nativeInvoke<ShellDeviceInfo>('device_info', undefined, 2_000)
}

/**
 * Tells the shell whether the service bar is on screen. The shell needs this for
 * two keys it owns above the WebView: it forwards BACK to the bar instead of
 * quitting the app while the bar is up, and it only intercepts UP to open the bar
 * while it is down. Guarded and a no-op off Android.
 */
export function reportServiceMenuOpen(isOpen: boolean): void {
  try {
    window.AndroidBridge?.setServiceMenuOpen?.(isOpen)
  } catch {
    // A missing or throwing native bridge must never break the player.
  }
}

/**
 * Opens the system screen where the operator allows the player to put itself back
 * on screen. Resolves false when the device has no such screen, so the bar can say
 * so instead of appearing to do nothing.
 */
export async function requestRecoveryPermission(): Promise<boolean> {
  return (await nativeInvoke<boolean>('request_recovery_permission')) ?? false
}

/**
 * Quits the player process. Returns false when there is no shell to quit — the
 * menu then keeps the button disabled instead of offering an action that does
 * nothing, since a dead button on a TV reads as a frozen device.
 */
export function closeApp(): boolean {
  const close = window.AndroidBridge?.closeApp
  if (!close) {
    return false
  }
  try {
    close()
    return true
  } catch {
    return false
  }
}

/**
 * Takes this display off its screen, from the device side.
 *
 * Deliberately local-only: it drops what this device holds (token, identity,
 * cached snapshot and media) and asks the shell to drop its durable device id and
 * restart. It does NOT delete the screen in the CMS — a device standing in a
 * hallway must never be able to remove a customer's screen record, and the
 * operator who reassigns the box is the one who tidies up the CMS side.
 *
 * The web wipe runs BEFORE the native call, because the native side restarts the
 * process the moment it is invoked; anything left until after would not run.
 */
export async function deactivateDevice(): Promise<void> {
  clearToken()
  clearCachedPairingCode()
  clearLocalDeviceId()
  await clearSnapshot()
  await clearMediaCaches()

  if (hasNativeBridge()) {
    // Drops `device.json` and relaunches; the reload below never gets to run.
    await nativeInvoke('deactivate', undefined, 2_000)
  }
  // The browser/desktop path, and the safety net if the native restart is
  // refused: come back on a clean boot, which now finds no token and pairs anew.
  window.location.reload()
}
