import { online } from '../store'

/**
 * How long to stay optimistically online at startup before trusting an initial
 * `navigator.onLine === false`. WebView2 / Android WebView can report a premature
 * `false` before their network stack settles at boot, which would otherwise hide
 * every network-only app (and flip an all-network-app playlist to the splash) on
 * a device that actually has connectivity.
 */
const STARTUP_GRACE_MS = 5000

/**
 * Tracks internet availability from the browser's `online`/`offline` events and
 * mirrors it into the {@link online} signal, so the engine hides network-only
 * apps (YouTube/Web/Canva) the instant the link drops and brings them back the
 * instant it returns — reactively, with no reload.
 *
 * `navigator.onLine` reflects the OS network state: a pulled cable or dropped
 * Wi-Fi flips it (and fires the matching event) immediately. It can't tell a
 * connected-but-uplink-less LAN from real internet — an accepted limitation; the
 * events are what the operator toggles when they turn connectivity off/on.
 *
 * A `true` reading is trusted immediately, but an initial `false` is treated as
 * possibly-premature (see {@link STARTUP_GRACE_MS}): we stay online for a short
 * grace and only trust it if it is still false and no `online` event arrived.
 *
 * Returns a disposer that detaches the listeners. No-op outside a browser.
 */
export function startOnline(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  let graceTimer: ReturnType<typeof setTimeout> | undefined
  const clearGrace = (): void => {
    if (graceTimer !== undefined) {
      clearTimeout(graceTimer)
      graceTimer = undefined
    }
  }

  const onOnline = (): void => {
    clearGrace()
    online.value = true
  }
  const onOffline = (): void => {
    clearGrace()
    online.value = false
  }

  // Re-sync now in case connectivity changed between module load (which seeded
  // the signal) and this listener attach.
  if (typeof navigator !== 'undefined') {
    if (navigator.onLine) {
      online.value = true
    } else {
      // Possibly a premature boot-time `false` — stay online for the grace, then
      // trust it only if it is still false (an `online` event meanwhile cancels).
      online.value = true
      graceTimer = setTimeout(() => {
        graceTimer = undefined
        online.value = navigator.onLine
      }, STARTUP_GRACE_MS)
    }
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  return () => {
    clearGrace()
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
