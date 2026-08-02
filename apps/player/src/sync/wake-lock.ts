/**
 * Keeps the display awake while the player is running.
 *
 * A signage screen is never touched, so a browser player (TV, tablet, phone) is
 * exactly the case an OS screensaver is built to catch — it dims mid-loop and
 * the content is gone until someone walks over. The native shells already solve
 * this at the OS level (Android sets `FLAG_KEEP_SCREEN_ON`), which leaves the
 * web player as the one runtime with nothing holding the screen on.
 *
 * The lock cannot simply be taken once: the browser drops it whenever the
 * document stops being visible and never hands it back on its own. So the shape
 * that actually works is re-acquire — on `visibilitychange` back to visible, on
 * the sentinel's own `release`, and on a slow backstop tick for the releases
 * that come from neither (a battery-saver kicking in, say). It is held through
 * standby too: standby paints black on purpose, and letting the TV's own
 * screensaver take that over would replace it with something worse.
 *
 * Everything here is best effort. A missing API (older Safari, an insecure
 * context), a denial, or a throw must never reach playback.
 */

import { screenAwake } from '../store'

interface WakeLockSentinelLike {
  readonly released: boolean
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>
}

/** How often to re-check that we still hold the lock. */
const RECHECK_MS = 60_000

function wakeLockApi(): WakeLockLike | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }
  return (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock
}

function isVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

/**
 * Acquires the screen wake lock and keeps re-acquiring it for as long as the
 * player runs. Returns a disposer that releases it.
 */
export function startWakeLock(): () => void {
  const api = wakeLockApi()
  if (!api) {
    return () => undefined
  }

  let sentinel: WakeLockSentinelLike | null = null
  let stopped = false
  /** Guards against a second request racing in while one is still in flight. */
  let requesting = false

  const acquire = async (): Promise<void> => {
    if (stopped || sentinel || requesting || !isVisible()) {
      return
    }
    requesting = true
    try {
      const lock = await api.request('screen')
      // Disposed while the request was in flight — don't leave it held.
      if (stopped) {
        void lock.release().catch(() => undefined)
        return
      }
      sentinel = lock
      screenAwake.value = true
      lock.addEventListener('release', () => {
        if (sentinel === lock) {
          sentinel = null
          screenAwake.value = false
        }
      })
    } catch {
      // Denied (or unavailable in this context). The backstop tick retries; a
      // screen that simply never grants it just behaves as it does today.
    } finally {
      requesting = false
    }
  }

  const onVisibility = (): void => {
    // The browser releases the lock on the way out, so coming back is the moment
    // that matters — the sentinel is already gone by now.
    if (isVisible()) {
      void acquire()
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility)
  }
  const timer = setInterval(() => {
    void acquire()
  }, RECHECK_MS)

  void acquire()

  return () => {
    stopped = true
    clearInterval(timer)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility)
    }
    const held = sentinel
    sentinel = null
    screenAwake.value = false
    void held?.release().catch(() => undefined)
  }
}
