/**
 * Live health facts the player sends with each heartbeat, so a screen's state can
 * be read from the dashboard instead of reconstructed from the outside.
 *
 * Everything here is cheap on purpose. The heartbeat runs every 30 seconds on
 * hardware that struggles, so nothing in this module may scan, walk or fetch: the
 * cache counts come from the warm-up pass that already visited every URL, and the
 * disk reading is one synchronous call into the shell.
 *
 * Every field is optional and simply omitted where it cannot be known, rather than
 * defaulted. A zero would read as a fault; an absence reads as what it is.
 */
import type { PlayerDiagnostics } from './types'
import { freeDiskBytes, shellHealth } from './native/runtime'
import { prefetchSummary } from './sync/prefetch'

/**
 * Whether a service worker actually controls this page.
 *
 * Not "is one registered" — controlling is the property that matters. An
 * uncontrolled page's requests never reach the worker, so nothing is cached while
 * every request still succeeds and the screen looks entirely healthy. A device
 * inspected in the field had an empty video cache after a full rotation for
 * exactly this reason, and nothing on the outside said so.
 */
function serviceWorkerControlled(): boolean | undefined {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined
  }
  return navigator.serviceWorker.controller !== null
}

export async function collectDiagnostics(): Promise<PlayerDiagnostics> {
  const cache = prefetchSummary()
  // Both cross the native bridge, so they go together rather than in sequence.
  const [free, health] = await Promise.all([freeDiskBytes(), shellHealth()])
  const sw = serviceWorkerControlled()

  return {
    ...(cache ?? {}),
    ...(free === undefined ? {} : { freeDiskBytes: free }),
    ...(sw === undefined ? {} : { serviceWorkerControlled: sw }),
    // Counters, not a snapshot: `recoveries` is what makes a screen that
    // struggled overnight distinguishable from one that slept through it.
    ...(health?.recoveries === undefined
      ? {}
      : { recoveries: health.recoveries }),
    ...(health?.lastCrash ? { lastCrash: health.lastCrash } : {}),
    // Zero means "never crashed", which is not a time — send nothing instead of
    // a date in 1970 that an operator has to learn to ignore.
    ...(health?.lastCrashAt ? { lastCrashAt: health.lastCrashAt } : {}),
  }
}
