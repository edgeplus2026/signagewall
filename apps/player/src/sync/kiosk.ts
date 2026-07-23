import { effect } from '@preact/signals'

import { kioskMode } from '../store'

/**
 * Drives the native shell's kiosk lockdown from the `kioskMode` signal. The
 * effect runs on mount with the persisted value — so an OFFLINE reboot re-applies
 * the lock before the socket reconnects — and again on every change pushed from
 * the CMS. Fire-and-forget over the Android bridge, guarded so a missing or
 * throwing bridge never breaks playback. No-op off Android (a plain browser and
 * the Tauri desktop shell expose no `AndroidBridge`, and the OS handles kiosk
 * behavior there differently). Returns a disposer.
 */
export function startKioskLock(): () => void {
  return effect(() => {
    const mode = kioskMode.value
    try {
      window.AndroidBridge?.setKioskLock?.(mode)
    } catch {
      // A missing or throwing native bridge must never break the player.
    }
  })
}
