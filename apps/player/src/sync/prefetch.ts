import { effect } from '@preact/signals'

import { snapshot } from '../store'
import type { PlayerSnapshot } from '../types'

/**
 * Warms the service-worker media cache with *every* item in the current
 * snapshot, so going offline at any point — or crossing the loop seam — never
 * hits an unfetched URL.
 *
 * This lives in the sync layer, NOT the playback engine, on purpose: cache
 * warming is an offline-first concern, independent of whether anything is being
 * rendered. In particular it keeps running while the screen is in standby (Stage
 * unmounted), so content pushed during off-hours — e.g. an overnight campaign
 * roll-out — is already cached when the working-hours window opens, even if the
 * network is down at that moment.
 */

/** Injectable seam so the warm loop is deterministic in tests. */
export interface PrefetchDeps {
  /** Best-effort fetch of one URL; resolves whether it hit or missed. */
  fetch: (url: string, signal: AbortSignal) => Promise<void>
  isCached: (url: string) => Promise<boolean>
  /** True when cached bytes are near the storage quota — stop warming. */
  overBudget: () => Promise<boolean>
}

const defaultDeps: PrefetchDeps = {
  fetch: async (url, signal) => {
    // Low priority so warming never starves the bytes the on-screen item is
    // actively fetching; no-cors because we only care about filling the cache.
    await fetch(url, {
      mode: 'no-cors',
      signal,
      priority: 'low',
    } as RequestInit & { priority: 'low' })
  },
  isCached: async (url) => {
    if (typeof caches === 'undefined') {
      return false
    }
    try {
      return (await caches.match(url)) !== undefined
    } catch {
      return false
    }
  },
  overBudget: async () => {
    const storage = navigator.storage as StorageManager | undefined
    if (!storage?.estimate) {
      return false
    }
    try {
      const { usage, quota } = await storage.estimate()
      if (!usage || !quota) {
        return false
      }
      return usage / quota > 0.9
    } catch {
      return false
    }
  },
}

function mediaUrls(snap: PlayerSnapshot | null): string[] {
  if (!snap) {
    return []
  }
  return snap.items.flatMap((item) =>
    item.kind === 'image' || item.kind === 'video' ? [item.url] : [],
  )
}

/**
 * Owns a single-flight warm-up pass over the current media URL set. Restarts
 * only when that set actually changes (so a data-only refresh — e.g. weather —
 * never aborts an in-flight large-video download), and retries the same set on
 * reconnect (a pass that failed while offline left items uncached).
 */
export class CacheWarmer {
  private abort: AbortController | null = null
  private running = false
  private lastKey: string | null = null
  /** The in-flight pass, exposed so tests can await it. */
  private pass: Promise<void> = Promise.resolve()
  private readonly deps: PrefetchDeps

  constructor(deps: Partial<PrefetchDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps }
  }

  /** New content: (re)warm only if the media set changed. */
  onContent(urls: string[]): void {
    const key = urls.join('\n')
    if (key === this.lastKey) {
      return
    }
    this.lastKey = key
    this.restart(urls)
  }

  /** Reconnected: re-attempt the current set unless a pass is already running. */
  onOnline(urls: string[]): void {
    if (this.running || urls.length === 0) {
      return
    }
    this.restart(urls)
  }

  stop(): void {
    this.abort?.abort()
    this.abort = null
    this.running = false
  }

  /** Resolves once the current warm-up pass settles (test hook). */
  settle(): Promise<void> {
    return this.pass
  }

  private restart(urls: string[]): void {
    this.abort?.abort()
    if (urls.length === 0) {
      this.running = false
      return
    }
    const ctrl = new AbortController()
    this.abort = ctrl
    this.running = true
    this.pass = (async () => {
      try {
        for (const url of urls) {
          if (ctrl.signal.aborted) {
            return
          }
          // Skip what the cache already holds so a reconnect resumes at the
          // first un-warmed item instead of redoing the head every time.
          if (await this.deps.isCached(url)) {
            continue
          }
          if (ctrl.signal.aborted) {
            return
          }
          // Stop once storage is near full: pushing more would make the
          // CacheFirst LRU evict what we already warmed (churn wasting egress).
          if (await this.deps.overBudget()) {
            return
          }
          try {
            await this.deps.fetch(url, ctrl.signal)
          } catch {
            // Offline or transient — leave it for the next reconnect.
          }
        }
      } finally {
        // Only the latest pass clears the flag; a restart already replaced it.
        if (this.abort === ctrl) {
          this.running = false
        }
      }
    })()
  }
}

/**
 * Wires a {@link CacheWarmer} to the snapshot signal (rewarm on content change)
 * and the `online` event (retry after reconnect). Returns a disposer. Runs
 * independently of the Stage lifecycle, so standby never pauses cache warming.
 */
export function startPrefetch(): () => void {
  const warmer = new CacheWarmer()
  const stop = effect(() => {
    warmer.onContent(mediaUrls(snapshot.value))
  })
  const onOnline = (): void => {
    warmer.onOnline(mediaUrls(snapshot.value))
  }
  window.addEventListener('online', onOnline)
  return () => {
    stop()
    window.removeEventListener('online', onOnline)
    warmer.stop()
  }
}
