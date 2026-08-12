import { effect } from '@preact/signals'

import { snapshot } from '../store'
import type { PlayerSnapshot } from '../types'
import { privateAppAssetCacheKey } from './private-app-asset-cache-key'
import { collectPrivateAppAssetUrls } from './private-app-assets'

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

/**
 * Origins proven to serve media without CORS headers, so the rest of their URLs
 * skip straight to `no-cors` instead of paying a doomed round trip each. Only
 * recorded once a `no-cors` retry actually succeeded — a plain outage must not
 * be mistaken for a missing header, or one offline pass would downgrade the host
 * for the whole session.
 */
const noCorsOrigins = new Set<string>()

function originOf(url: string): string {
  try {
    // Media URLs are absolute (the public bucket), so the base only matters for
    // a relative one — and must not be required, since this module is also
    // loaded where there is no document.
    const base = typeof location === 'undefined' ? undefined : location.href
    return new URL(url, base).origin
  } catch {
    return url
  }
}

/**
 * Whether the service worker would route this URL to the video cache. Mirrors
 * the extension test in `vite.config.ts` — its companion `destination === 'video'`
 * check can never fire here, because a `fetch()` has destination `empty`.
 */
function isVideoUrl(url: string): boolean {
  return /\.(?:mp4|webm|mov|m4v|ogg)$/i.test(url.split(/[?#]/, 1)[0] ?? url)
}

/** One warm-up fetch. Low priority so it never starves the on-screen item. */
function warmFetch(
  url: string,
  mode: RequestMode,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(url, { mode, signal, priority: 'low' } as RequestInit & {
    priority: 'low'
  })
}

/**
 * Warms one media URL into the service-worker cache.
 *
 * `cors` first, and the mode is the whole point: an opaque (`no-cors`) response
 * has an unreadable body, and the service worker can only satisfy a video
 * element's `Range:` request by slicing the bytes it cached. So the SW keeps
 * readable 200s only (see `vite.config.ts`) — warming in `no-cors` would fill
 * the cache with entries it then refuses to keep.
 */
export async function warmMediaUrl(
  url: string,
  signal: AbortSignal,
): Promise<void> {
  const origin = originOf(url)
  if (noCorsOrigins.has(origin)) {
    // A host we already know sends no CORS headers. Images are still worth
    // warming (the image cache keeps opaque responses), but a video would be
    // downloaded in full only for the SW to refuse it — burning the clip's whole
    // size again on every content change. Skip it and let it stream live.
    if (!isVideoUrl(url)) {
      await warmFetch(url, 'no-cors', signal)
    }
    return
  }
  try {
    await warmFetch(url, 'cors', signal)
    return
  } catch (error) {
    if (signal.aborted) {
      throw error
    }
    // Retry without CORS. If THAT works the host simply sends no CORS headers, so
    // remember it and stop paying the doomed round trip for its other URLs. If it
    // fails too we were merely offline — leave the origin unmarked so the next
    // pass leads with `cors` again.
    await warmFetch(url, 'no-cors', signal)
    noCorsOrigins.add(origin)
  }
}

const defaultDeps: PrefetchDeps = {
  fetch: warmMediaUrl,
  isCached: async (url) => {
    if (typeof caches === 'undefined') {
      return false
    }
    try {
      // `ignoreVary` for the same reason the SW routes set it: a CORS response
      // carrying `Vary: Origin` would never match this header-less lookup, and we
      // would re-download the whole playlist on every pass.
      if ((await caches.match(url, { ignoreVary: true })) !== undefined) {
        return true
      }
      const parsed = new URL(url)
      if (!parsed.pathname.includes('/private-assets/v1/')) {
        return false
      }
      const immutableKey = privateAppAssetCacheKey(url)
      return immutableKey
        ? (await caches.match(immutableKey, { ignoreVary: true })) !== undefined
        : false
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
  const publicMedia = snap.items.flatMap((item) =>
    item.kind === 'image' || item.kind === 'video' ? [item.url] : [],
  )
  return [...new Set([...publicMedia, ...collectPrivateAppAssetUrls(snap)])]
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
  /** True once a pass warmed the whole set with no failure/abort/budget stop —
   *  so a reconnect can skip re-scanning an already-fully-warmed set. */
  private complete = false
  /** The in-flight pass, exposed so tests can await it. */
  private pass: Promise<void> = Promise.resolve()
  private readonly deps: PrefetchDeps

  constructor(deps: Partial<PrefetchDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps }
  }

  /** New content: (re)warm only if the media set changed. */
  onContent(urls: string[]): void {
    // Compare on the STABLE cache identity, not the raw URL. A private app
    // asset arrives as a signed URL whose signature/`X-Amz-Date` changes on
    // every push, so keying on the raw string made any re-push of a screen
    // carrying a Power BI Secure instance look like a brand-new set — aborting
    // a partially-downloaded large video that then never finished caching.
    const key = urls.map((url) => privateAppAssetCacheKey(url) ?? url).join('\n')
    if (key === this.lastKey) {
      return
    }
    this.lastKey = key
    this.complete = false // a new set is unwarmed
    this.restart(urls)
  }

  /**
   * Reconnected: re-attempt the current set unless a pass is already running or
   * the set is already fully warmed. The `complete` guard means a flapping link
   * doesn't re-scan (a Cache lookup per URL) the whole playlist on every `online`
   * event once everything is cached — only a genuinely incomplete set retries.
   */
  onOnline(urls: string[]): void {
    if (this.running || this.complete || urls.length === 0) {
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
    this.complete = false
    this.pass = (async () => {
      // Cleared on any abort/budget-stop/fetch failure, so `complete` is only set
      // when the whole set is genuinely warmed and a reconnect can safely skip it.
      let allWarmed = true
      try {
        for (const url of urls) {
          if (ctrl.signal.aborted) {
            allWarmed = false
            return
          }
          // Skip what the cache already holds so a reconnect resumes at the
          // first un-warmed item instead of redoing the head every time.
          if (await this.deps.isCached(url)) {
            continue
          }
          if (ctrl.signal.aborted) {
            allWarmed = false
            return
          }
          // Stop once storage is near full: pushing more would make the
          // CacheFirst LRU evict what we already warmed (churn wasting egress).
          if (await this.deps.overBudget()) {
            allWarmed = false
            return
          }
          try {
            await this.deps.fetch(url, ctrl.signal)
          } catch {
            // Offline or transient — leave it for the next reconnect.
            allWarmed = false
          }
        }
      } finally {
        // Only the latest pass clears the flag; a restart already replaced it.
        if (this.abort === ctrl) {
          this.running = false
          this.complete = allWarmed
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
