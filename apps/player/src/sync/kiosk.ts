import { effect } from '@preact/signals'

import { setStoredKioskMode } from '../device'
import { isKioskMode } from '../device-settings'
import { kioskMode, snapshot } from '../store'
import type { KioskMode } from '../types'

/**
 * Kiosk lockdown is device-local: it is set here, on the screen itself, from the
 * service menu, and never travels over the wire. It used to be a per-device CMS
 * setting pushed down on connect — which meant every reconnect silently re-applied
 * the dashboard's value over whatever the technician standing at the display had
 * just chosen, and an operator could lock a box nobody was next to.
 */

/**
 * Applies + persists the kiosk lockdown mode, ignoring unknown values. Only the
 * signal + storage are touched here; the native lock is driven reactively off the
 * `kioskMode` signal by {@link startKioskLock} — so an offline reboot re-locks from
 * the persisted value without anything having to ask it to.
 */
export function applyKioskMode(next: KioskMode): void {
  if (!isKioskMode(next)) {
    return
  }
  kioskMode.value = next
  setStoredKioskMode(next)
}

/**
 * Drives the native shell's kiosk lockdown from the `kioskMode` signal. The
 * effect runs on mount with the persisted value — so an OFFLINE reboot re-applies
 * the lock before anything else happens — and again whenever the service menu
 * changes it. Fire-and-forget over the Android bridge, guarded so a missing or
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

/**
 * The service menu's kiosk switch — the only thing that sets kiosk mode. Locking
 * always asks for `hard`; the shell drops to escapable screen-pinning by itself on
 * a box that isn't Device Owner, and the service menu says so next to the switch.
 *
 * It takes no PIN on purpose: someone already holding the remote in front of an
 * unattended display is not who a PIN keeps out.
 */
export function setKioskLockEnabled(enabled: boolean): void {
  applyKioskMode(enabled ? 'hard' : 'off')
}
