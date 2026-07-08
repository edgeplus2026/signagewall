import { online } from '../store'

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
 * Returns a disposer that detaches the listeners. No-op outside a browser.
 */
export function startOnline(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const onOnline = (): void => {
    online.value = true
  }
  const onOffline = (): void => {
    online.value = false
  }

  // Re-sync now in case connectivity changed between module load (which seeded
  // the signal) and this listener attach.
  if (typeof navigator !== 'undefined') {
    online.value = navigator.onLine
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
