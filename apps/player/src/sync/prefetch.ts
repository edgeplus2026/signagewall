import { effect } from '@preact/signals'

import { freeDiskBytes } from '../native/runtime'
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
  /** Resolves once warming can actually reach the service worker. */
  ready: () => Promise<void>
}

/** How long to wait for the worker to take over before warming regardless. */
const SW_CONTROL_TIMEOUT_MS = 10_000

/**
 * Resolves once the service worker actually CONTROLS this page.
 *
 * Warming before that is silently pointless: an uncontrolled page's `fetch()`
 * never passes through the worker, so nothing lands in the runtime caches — and
 * because every request still succeeds, the pass then marks itself complete and
 * no retry is ever attempted. Registration happens on `window.load` and takes a
 * moment, so a screen that just booted lost that race routinely and cached
 * nothing at all for its whole session; a device inspected in the field had an
 * empty video cache after a full rotation.
 *
 * Bounded, because a worker that never registers (unsupported browser, a failed
 * update) must not disable warming forever — an uncached player still plays fine
 * while online, and trying is strictly better than not.
 */
function serviceWorkerControlled(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve()
  }
  const container = navigator.serviceWorker
  if (container.controller) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      settle()
    }, SW_CONTROL_TIMEOUT_MS)
    const onChange = (): void => {
      settle()
    }
    function settle(): void {
      clearTimeout(timer)
      container.removeEventListener('controllerchange', onChange)
      resolve()
    }
    // `ready` resolves on ACTIVATION, which is not the same as this page being
    // controlled — on a first-ever load the worker activates and only then claims
    // its clients. `controllerchange` is the event that says the claim landed.
    container.addEventListener('controllerchange', onChange)
    void container.ready.then(() => {
      if (container.controller) {
        settle()
      }
    })
  })
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
 * One warm-up fetch. Low priority so it never starves the on-screen item.
 *
 * `cache: 'reload'` skips the browser's HTTP cache on the way out and replaces
 * whatever was in it with the response. That is deliberate repair, not
 * distrust: a URL an element already loaded `no-cors` is stored WITHOUT
 * `Access-Control-Allow-Origin` and, because R2 omits `Vary` on those, as the
 * only variant for that URL — so this `cors` request would be served it and
 * fail the CORS check without a byte crossing the network. Objects carry
 * `immutable, max-age=1y`, so nothing else would ever dislodge it.
 *
 * It costs no extra traffic: the caller already skips any URL the service
 * worker holds, so everything reaching here has to be downloaded regardless.
 */
function warmFetch(
  url: string,
  mode: RequestMode,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(url, {
    mode,
    signal,
    cache: 'reload',
    priority: 'low',
  } as RequestInit & { priority: 'low' })
}

/**
 * Reads a warm-up response to the end and throws the bytes away.
 *
 * `fetch()` resolves the moment the HEADERS arrive, so awaiting it says nothing
 * about whether the file was downloaded. Without this the pass marched through a
 * whole playlist in milliseconds, declared every URL warmed, and set `complete` —
 * while not one clip had actually been fetched. The service worker can only
 * finish its `cache.put` once the body has flowed, so draining is what makes the
 * cache fill at all.
 *
 * Read in chunks and discarded rather than buffered whole: these are 30MB+ video
 * clips on devices with very little memory to spare.
 */
async function drainBody(response: Response): Promise<void> {
  const body = response.body
  if (!body) {
    // An opaque (`no-cors`) response exposes no readable stream. Nothing to do —
    // the worker's own copy is fetched independently of ours.
    return
  }
  const reader = body.getReader()
  try {
    let done = false
    while (!done) {
      done = (await reader.read()).done
    }
  } finally {
    reader.releaseLock()
  }
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
    // A host we already know sends no CORS headers. Nothing to do: both runtime
    // caches now keep readable 200s only, so an opaque response would be
    // downloaded in full and then refused — the whole file's bandwidth spent on
    // every content change for an entry that is never stored. Images used to be
    // warmed here, back when that cache accepted opaque; it no longer does.
    // Such a host simply has no offline copy and streams live.
    return
  }
  // Only the HEADER exchange decides the CORS question, so the fallback is kept
  // around the fetch alone. Draining below must not be able to mark an origin
  // no-CORS: a connection dropped halfway through a 30MB clip says nothing about
  // its headers, and mistaking it for one would stop warming that host's video
  // for the rest of the session.
  let response: Response
  try {
    response = await warmFetch(url, 'cors', signal)
  } catch (error) {
    if (signal.aborted) {
      throw error
    }
    // Retry without CORS. If THAT works the host simply sends no CORS headers, so
    // remember it and stop paying the doomed round trip for its other URLs. If it
    // fails too we were merely offline — leave the origin unmarked so the next
    // pass leads with `cors` again.
    response = await warmFetch(url, 'no-cors', signal)
    noCorsOrigins.add(origin)
  }
  await drainBody(response)
}

/**
 * Free space to leave on the device, whatever the browser believes it may have.
 *
 * It has to cover the things that need room precisely when the cache is largest:
 * an OTA APK downloading itself into app storage, the WebView's own scratch space,
 * and Android's margin for not misbehaving. A signage box that fills its data
 * partition does not fail loudly — it fails as an update that never installs and a
 * screen nobody can fix remotely.
 */
const DISK_RESERVE_BYTES = 512 * 1024 * 1024

/**
 * Whether warming should stop to protect the device's storage.
 *
 * Asks the shell for real free bytes first, because the browser genuinely cannot
 * answer this: a storage quota is a share of the disk's TOTAL size (Chrome allows an
 * origin up to ~60% of it), so on a box that is already half full the quota is
 * LARGER than what is actually left. Measured on the Android TV here — 4 GB
 * partition, 1.7 GB free, so a quota near 2.4 GB and a 90%-of-quota guard that
 * could only ever trip after the disk was already gone.
 *
 * Off a native shell the quota ratio is all there is, so it stays as the fallback —
 * a weak proxy, but the desktop shell and a browser both run on machines where the
 * question is far less sharp.
 *
 * The failure directions are deliberately different. A missing `estimate` is a
 * property of the platform, stable and knowable, and refusing to warm there would
 * cost every such device its offline copy for nothing — so that answers "keep
 * going", with Workbox's `maxEntries` as the remaining bound. An `estimate` that
 * THROWS, or returns a quota that cannot be reasoned about, is an anomaly on a
 * platform that normally answers: that stops this pass and lets the next one retry.
 * The previous version returned "keep going" for every one of these.
 */
export async function isOverBudget(): Promise<boolean> {
  const free = await freeDiskBytes()
  if (free !== undefined) {
    return free < DISK_RESERVE_BYTES
  }

  const storage = navigator.storage as StorageManager | undefined
  if (!storage?.estimate) {
    return false
  }
  try {
    const { usage, quota } = await storage.estimate()
    if (quota === undefined || quota <= 0) {
      return true
    }
    // `usage ?? 0`, not `!usage`: a device with nothing cached yet reports 0, and
    // reading that as "could not measure" is how a fresh screen would decide it was
    // out of space before it had stored a single byte.
    return (usage ?? 0) / quota > 0.9
  } catch {
    return true
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
  overBudget: isOverBudget,
  ready: serviceWorkerControlled,
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
  /** Media URLs in the current set, and how many of them the cache holds. */
  private total = 0
  private warmed = 0
  private readonly deps: PrefetchDeps

  constructor(deps: Partial<PrefetchDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps }
  }

  /**
   * Cache state for the heartbeat, counted DURING the pass that already walks
   * every URL rather than recomputed on demand.
   *
   * The naive version asks the Cache API per URL each time it is read; at one
   * heartbeat every thirty seconds and a twenty-item playlist that is forty
   * lookups a minute, forever, so a screen can display "18/20". Nothing here
   * costs anything — the pass had to know these numbers anyway.
   */
  summary(): { cachedMedia: number; totalMedia: number; cacheComplete: boolean } {
    return {
      cachedMedia: this.warmed,
      totalMedia: this.total,
      cacheComplete: this.complete,
    }
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

  /**
   * Publishes a pass's running count, but only while that pass is still the
   * current one.
   *
   * An aborted pass does not stop instantly — it is parked on a fetch or a cache
   * lookup and resumes once. Writing its counter straight to `this.warmed` let it
   * land AFTER a newer pass had already reset the number, so a screen that had
   * just been given fresh content reported the old pass's progress against the
   * new pass's total. The heartbeat then showed "18 / 4".
   */
  private publish(ctrl: AbortController, cached: number): void {
    if (this.abort === ctrl) {
      this.warmed = cached
    }
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
      // Recounted from scratch each pass rather than incremented across passes:
      // the set can shrink, and a counter that only grows would report a screen
      // as fully cached long after half its content was replaced.
      let cached = 0
      this.total = urls.length
      this.warmed = 0
      try {
        // Nothing is cacheable until the worker controls the page — see
        // {@link serviceWorkerControlled}.
        await this.deps.ready()
        for (const url of urls) {
          if (ctrl.signal.aborted) {
            allWarmed = false
            return
          }
          // Skip what the cache already holds so a reconnect resumes at the
          // first un-warmed item instead of redoing the head every time.
          if (await this.deps.isCached(url)) {
            cached += 1
            this.publish(ctrl, cached)
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
            // "Warmed" has to mean the bytes are IN the cache, not that a
            // request came back. Taking the fetch at its word is what let a
            // pass that cached nothing still set `complete` — the one flag
            // that then blocks every reconnect retry, so a single bad pass
            // left the device permanently uncached.
            if (await this.deps.isCached(url)) {
              cached += 1
              this.publish(ctrl, cached)
            } else {
              allWarmed = false
            }
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
/**
 * The running warmer, so the heartbeat can report its cache state without owning
 * it. Null before boot and after teardown, which reads as "nothing to say" rather
 * than as an empty cache — a screen that has not started warming yet must not be
 * reported as one that failed to.
 */
let active: CacheWarmer | null = null

/** Cache state for the heartbeat, or undefined before warming has started. */
export function prefetchSummary():
  | ReturnType<CacheWarmer['summary']>
  | undefined {
  return active?.summary()
}

export function startPrefetch(): () => void {
  const warmer = new CacheWarmer()
  active = warmer
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
    if (active === warmer) {
      active = null
    }
  }
}
