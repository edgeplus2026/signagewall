import { effect } from '@preact/signals'

import type { KioskMode } from '../types'
import { kioskMode, snapshot } from '../store'
import { applyKioskMode } from './commands'

/**
 * The lock level to restore when the service menu switches the kiosk back ON.
 * The switch is a two-state control over a three-state setting, so turning it off
 * has to remember which level it turned off — otherwise a screen the CMS had
 * deliberately set to `soft` would come back `hard`. Defaults to `hard` because
 * that is what an operator who locks a signage box means; the shell degrades it
 * to screen-pinning by itself when the device isn't Device Owner.
 */
let lastLockedMode: KioskMode = 'hard'

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
    if (mode !== 'off') {
      lastLockedMode = mode
    }
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

/**
 * The service menu's kiosk switch. Writes through the same path as a CMS command
 * (`applyKioskMode`), so the choice persists and re-applies on an offline reboot
 * exactly like a remote one. The CMS stays the authority: its next push wins, and
 * this is the on-site override for a technician standing at the screen — which is
 * the whole reason it takes no PIN. Someone already holding the remote in front of
 * an unattended display is not who a PIN keeps out.
 */
export function setKioskLockEnabled(enabled: boolean): void {
  applyKioskMode(enabled ? lastLockedMode : 'off')
}
