import { effect } from '@preact/signals'

import { kioskMode, snapshot } from '../store'

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

/**
 * Pushes the screen's name to the Android shell so its on-device service dialog can
 * show it. The shell cannot know it otherwise — pairing lives entirely in the web
 * layer — and it is what a technician in front of the display matches against the
 * CMS. Fire-and-forget, guarded, and a no-op off Android. Returns a disposer.
 */
export function startScreenNameBridge(): () => void {
  return effect(() => {
    const name = snapshot.value?.name
    if (!name) {
      return
    }
    try {
      window.AndroidBridge?.setScreenName?.(name)
    } catch {
      // A missing or throwing native bridge must never break playback.
    }
  })
}
