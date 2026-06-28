import type { PlayerSnapshot, Renderable } from '../types'
import { Slot, type Surface } from './slot'

/**
 * The slice of {@link Slot} the controller drives. Extracted as an interface so
 * the playback loop can be unit-tested against a deterministic fake (no real
 * `<img>`/`<video>` decode), while production wires the real pooled slot.
 */
export interface PlaybackSlot {
  readonly el: HTMLElement
  prepare(item: Renderable, surface: Surface, volume: number): Promise<void>
  activate(onEnded: () => void): void
  deactivate(): void
  release(): void
  setVolume(volume: number): void
  tryUnmute(): void
  /**
   * The real decoded duration (ms) of the loaded video, or null when unknown or
   * the slot isn't showing a video. Lets the loop key its dwell/watchdog on the
   * actual length instead of trusting (possibly stale) snapshot metadata.
   */
  mediaDurationMs(): number | null
}

const WATCHDOG_INTERVAL_MS = 5_000
const WATCHDOG_GRACE_MS = 15_000
const MIN_DWELL_MS = 1_000
const SKIP_DELAY_MS = 250
/** Crossfade duration; must match the `.player-slot` opacity transition in CSS. */
const TRANSITION_MS = 600

export interface ControllerCallbacks {
  onItem?: (item: Renderable) => void
  onError?: (error: unknown, item?: Renderable) => void
}

export interface ControllerOptions {
  /**
   * Follow (mirror) mode: the controller never advances on its own — no dwell
   * timer, no video-`ended` advance, no skip-on-error advance, no watchdog
   * force-advance. It only changes item when {@link PlaybackController.showItem}
   * is called. Used by the CMS preview so it tracks the real device 1:1 instead
   * of running its own drifting clock.
   */
  follow?: boolean
}

/**
 * Drives the playback loop over two pooled {@link Slot}s (A/B double buffer).
 *
 * Correctness model (what keeps a 24/7 screen alive and glitch-free):
 *  - **Single-flight**: only one transition touches the slots at a time, so the
 *    shared back buffer is never clobbered mid-prepare.
 *  - **Epoch**: every transition request bumps `epoch`. An in-flight transition
 *    aborts its swap if a newer request arrived while it was awaiting, and its
 *    `finally` relaunches toward the latest target — so a `content:update` (or a
 *    stray advance) that lands during a slow load never corrupts state.
 *  - **Readiness**: a swap only happens after the back slot's `prepare()` (or the
 *    matching preload) has *resolved* — we never reveal an undecoded image or an
 *    unbuffered video, so the front stays up and there is no black flash.
 *  - **Skip on failure**: a failed item is skipped, never blocking the loop.
 *  - **Watchdog**: force-advances if the scheduler ever stalls.
 */
export class PlaybackController {
  private readonly slots: [PlaybackSlot, PlaybackSlot]
  private activeIndex = 0
  private items: Renderable[] = []
  private cursor = 0
  private revision: string | null = null
  private volume = 1

  private epoch = 0
  private targetIndex = 0
  private transitioning = false
  private preload: { index: number; promise: Promise<void> } | null = null

  private advanceTimer: number | undefined
  private watchdogTimer: number | undefined
  private preloadTimer: number | undefined
  private lastAdvanceAt = 0
  private currentDurationMs = 0
  private destroyed = false
  /** Guards against the watchdog re-reporting the same stall episode each tick. */
  private stallReported = false

  /** Direction of travel (1 = forward, -1 = back); steers skip-on-failure. */
  private direction: 1 | -1 = 1
  private prefetchAbort: AbortController | null = null
  private prefetching = false

  /** Mirror mode — never auto-advances; driven only by {@link showItem}. */
  private readonly follow: boolean

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: ControllerCallbacks = {},
    createSlot: () => PlaybackSlot = () => new Slot(),
    options: ControllerOptions = {},
  ) {
    this.follow = options.follow ?? false
    this.slots = [createSlot(), createSlot()]
    this.root.append(this.slots[0].el, this.slots[1].el)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility)
      // Recover sound on the first video, which the browser's autoplay policy
      // may have forced to muted in a non-kiosk browser. The first user gesture
      // grants audio permission; replay it onto the slots once, then detach. On
      // a kiosk (autoplay-with-sound allowed) the first play() already kept its
      // sound, so the slots have nothing to unmute and this is harmless.
      document.addEventListener('pointerdown', this.handleUserGesture)
      document.addEventListener('keydown', this.handleUserGesture)
    }
  }

  private readonly handleUserGesture = (): void => {
    // Only attempt the unmute when the browser actually reports an active user
    // activation; otherwise the unmute would just be rejected (and the picture
    // would briefly re-enter playback for nothing). Where the API is absent we
    // optimistically try — the handler fires inside a real gesture anyway.
    const activation = navigator.userActivation as
      | { isActive: boolean }
      | undefined
    if (activation && !activation.isActive) {
      return
    }
    this.slots[0].tryUnmute()
    this.slots[1].tryUnmute()
  }

  /**
   * Sets playback volume (0–1) on both slots so a live change is immediate.
   * Audio is governed entirely by volume (muted iff 0); there is no separate
   * gesture-driven unmute, so a 24/7 signage screen never tries to un-mute an
   * already-playing video — which the browser's autoplay policy would punish by
   * pausing it.
   */
  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume))
    if (this.volume === clamped) {
      return
    }
    this.volume = clamped
    this.slots[0].setVolume(clamped)
    this.slots[1].setVolume(clamped)
  }

  /** Loads a snapshot. Ignored if the revision is unchanged (dedupe). */
  load(snapshot: PlayerSnapshot): void {
    if (snapshot.revision === this.revision && this.items.length > 0) {
      return
    }
    this.revision = snapshot.revision
    this.items = snapshot.items
    this.cursor = 0
    this.direction = 1
    this.preload = null
    this.clearPreloadTimer()

    if (this.items.length > 0) {
      this.requestTransition(0)
      // In follow mode the device owns advancement; we never auto-advance, so
      // there is no stall to watch for. (We still preload the head above via the
      // initial transition, and prefetch warms the cache for offline safety.)
      if (!this.follow) {
        this.startWatchdog()
      }
      this.prefetchAll(true)
    }
  }

  /**
   * Follow mode: mirror the device by jumping to the item it reports as now
   * playing. A no-op outside follow mode, or when the id isn't in the current
   * snapshot (a transient cross-revision race — the matching `content:update`
   * lands moments later and re-bases us).
   */
  showItem(itemId: string): void {
    if (!this.follow || this.items.length === 0) {
      return
    }
    const index = this.items.findIndex((item) => item.id === itemId)
    if (index === -1 || index === this.cursor) {
      return
    }
    this.direction = index >= this.cursor ? 1 : -1
    this.requestTransition(index)
  }

  /**
   * Warms the SW media cache with *every* item up front (not just the one-ahead
   * preload), so going offline at any point — or navigating back / across the
   * loop seam — never hits an unfetched URL. Fetches are sequential and best
   * effort: failures (e.g. already offline) are swallowed, and a re-run after
   * reconnect is cheap since cached entries resolve from the cache.
   */
  prefetchAll(force = false): void {
    if (this.items.length === 0) {
      return
    }
    // A flaky link fires 'online' repeatedly. Restarting a healthy warm-up each
    // time would keep cancelling mid-download and never reach the tail, so let a
    // running pass continue; only `load()` (new content) forces a fresh restart.
    if (this.prefetching && !force) {
      return
    }
    this.prefetchAbort?.abort()
    const controller = new AbortController()
    this.prefetchAbort = controller
    this.prefetching = true
    const urls = this.items.flatMap((item) =>
      item.kind === 'image' || item.kind === 'video' ? [item.url] : [],
    )

    void (async () => {
      try {
        for (const url of urls) {
          if (controller.signal.aborted || this.destroyed) {
            return
          }
          // Skip what the SW cache already holds, so a restart resumes at the
          // first un-warmed item instead of redoing the head every reconnect.
          if (await this.isCached(url)) {
            continue
          }
          if (controller.signal.aborted || this.destroyed) {
            return
          }
          // Stop warming once storage is near full: pushing more in would make
          // the CacheFirst LRU evict items we already cached (churn), wasting
          // egress on bytes that won't survive. Already-cached items above are
          // still skipped, so the warm set we have is preserved.
          if (await this.overStorageBudget()) {
            return
          }
          try {
            // Low priority so warming the cache never starves the bytes the
            // playback slot is actively fetching for the on-screen item.
            await fetch(url, {
              mode: 'no-cors',
              signal: controller.signal,
              priority: 'low',
            } as RequestInit & { priority: 'low' })
          } catch {
            // Offline or transient — leave it for the next reconnect/prefetch.
          }
        }
      } finally {
        // Only the latest pass clears the flag; a forced restart already
        // replaced the controller and owns the warm-up now.
        if (this.prefetchAbort === controller) {
          this.prefetching = false
        }
      }
    })()
  }

  /** True when cached bytes are within ~10% of the origin's storage quota. */
  private async overStorageBudget(): Promise<boolean> {
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
  }

  private async isCached(url: string): Promise<boolean> {
    if (typeof caches === 'undefined') {
      return false
    }
    try {
      return (await caches.match(url)) !== undefined
    } catch {
      return false
    }
  }

  destroy(): void {
    this.destroyed = true
    this.epoch += 1
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility)
      document.removeEventListener('pointerdown', this.handleUserGesture)
      document.removeEventListener('keydown', this.handleUserGesture)
    }
    this.prefetchAbort?.abort()
    this.clearAdvanceTimer()
    this.clearPreloadTimer()
    if (this.watchdogTimer !== undefined) {
      window.clearInterval(this.watchdogTimer)
      this.watchdogTimer = undefined
    }
    this.preload = null
    for (const slot of this.slots) {
      slot.release()
      slot.el.remove()
    }
  }

  /** Manually advance to the next item (e.g. a remote/keyboard control). */
  next(): void {
    this.advance()
  }

  /** Manually step back to the previous item, wrapping at the start. */
  previous(): void {
    if (this.items.length === 0) {
      return
    }
    this.direction = -1
    this.requestTransition(this.wrap(this.cursor - 1))
  }

  /** Records a new target and kicks (or re-kicks) the single-flight runner. */
  private requestTransition(index: number): void {
    if (this.destroyed) {
      return
    }
    // Cancel any pending warm-up so a preload timer can't fire mid-transition
    // and call prepare() on the slot this transition is already using (which
    // would clobber its in-flight decode and stall the loop). It re-arms after
    // the next successful swap.
    this.clearPreloadTimer()
    this.epoch += 1
    this.targetIndex = index
    if (!this.transitioning) {
      this.run()
    }
  }

  private run(): void {
    const epoch = this.epoch
    const index = this.targetIndex
    void this.runTransition(index, epoch)
  }

  private async runTransition(index: number, epoch: number): Promise<void> {
    this.transitioning = true
    try {
      await this.showAt(index, epoch)
    } finally {
      this.transitioning = false
      // A newer request arrived while we ran — honor the latest target.
      if (!this.destroyed && epoch !== this.epoch) {
        this.run()
      }
    }
  }

  private advance(): void {
    if (this.items.length === 0) {
      return
    }
    this.direction = 1
    this.requestTransition(this.wrap(this.cursor + 1))
  }

  private wrap(index: number): number {
    const len = this.items.length
    return ((index % len) + len) % len
  }

  private async showAt(index: number, epoch: number): Promise<void> {
    this.clearAdvanceTimer()

    const item = this.items[index]
    if (!item) {
      return
    }

    const back = this.slots[this.activeIndex ^ 1]

    // Await the matching preload if present, else prepare just-in-time. Either
    // way we only proceed once the content is decoded/buffered (resolved).
    let prep: Promise<void>
    if (this.preload && this.preload.index === index) {
      prep = this.preload.promise
    } else {
      prep = back.prepare(item, this.surface(), this.volume)
    }
    this.preload = null

    try {
      await prep
    } catch (error) {
      if (this.destroyed || epoch !== this.epoch) {
        return
      }
      this.callbacks.onError?.(error, item)
      // Follow mode doesn't skip on its own — it waits for the device to move on.
      if (!this.follow) {
        this.scheduleSkip(index)
      }
      return
    }

    // Superseded by a newer load/advance while we were loading — drop this swap.
    if (this.destroyed || epoch !== this.epoch) {
      return
    }

    const front = this.slots[this.activeIndex]
    back.activate(() => {
      // In follow mode the device drives advancement; a video ending here must
      // not move us — we wait for the device's next now-playing report.
      if (!this.follow) {
        this.advance()
      }
    })
    // Cross-fade: reveal the (decoded) back slot while the front fades out. We
    // only drop `is-active` here so the front fades over CSS without tearing its
    // media down yet — its buffers are reclaimed lazily by `release()` when the
    // slot is next prepared, so we never hide content that a preload just filled.
    front.deactivate()
    this.activeIndex ^= 1
    this.cursor = index
    this.lastAdvanceAt = Date.now()
    this.stallReported = false
    // For video, trust the element's real decoded duration over the (possibly
    // stale) snapshot metadata, so neither the dwell nor the watchdog cuts a
    // long or rebuffering clip short. Falls back to metadata when unknown.
    const activeSlot = this.slots[this.activeIndex]
    this.currentDurationMs =
      item.kind === 'video'
        ? (activeSlot.mediaDurationMs() ?? item.durationMs)
        : item.durationMs
    this.callbacks.onItem?.(item)
    // Video advances on its natural `ended` event (wired in activate); we never
    // arm a wallclock cap, which would truncate a rebuffering or wrong-metadata
    // clip. Images/apps have no `ended`, so they dwell on a timer. The watchdog
    // (keyed on the real duration above) is the backstop if a video's `ended` is
    // ever lost. Follow mode never schedules its own advance either.
    if (!this.follow && item.kind !== 'video') {
      this.scheduleAdvance(item)
    }

    // Warm the back buffer with the following item so the next swap is instant —
    // but only after the outgoing slot has finished fading out, since preparing
    // it (which calls release()) would otherwise cut its cross-fade short.
    this.schedulePreload()
  }

  private schedulePreload(): void {
    if (this.preloadTimer !== undefined) {
      window.clearTimeout(this.preloadTimer)
    }
    this.preloadTimer = window.setTimeout(() => {
      this.preloadTimer = undefined
      this.preloadNext()
    }, TRANSITION_MS)
  }

  private preloadNext(): void {
    // Never warm the back buffer while a transition is using it — the swap owns
    // the slots until it completes, then re-schedules the preload itself.
    if (this.destroyed || this.transitioning || this.items.length < 2) {
      return
    }
    // Warm the neighbour in the current direction of travel, so back-stepping
    // benefits from the preload instead of always falling back to a JIT prepare.
    const next = this.wrap(this.cursor + this.direction)
    const item = this.items[next]
    if (!item || this.preload?.index === next) {
      return
    }

    const back = this.slots[this.activeIndex ^ 1]
    const promise = back.prepare(item, this.surface(), this.volume)
    this.preload = { index: next, promise }
    promise.catch((error: unknown) => {
      // Only report if this preload is still pending. If showAt already consumed
      // it (preload nulled), showAt's own catch handles the failure — avoid a
      // duplicate onError for the same rejection.
      if (this.preload?.index === next) {
        this.preload = null
        this.callbacks.onError?.(error, item)
      }
    })
  }

  /** Arms the dwell timer for a non-video item (images/apps have no `ended`). */
  private scheduleAdvance(item: Renderable): void {
    this.clearAdvanceTimer()
    this.advanceTimer = window.setTimeout(() => {
      this.advance()
    }, Math.max(MIN_DWELL_MS, item.durationMs))
  }

  private scheduleSkip(index: number): void {
    this.clearAdvanceTimer()
    // Skip in the current direction of travel, so a failed item under manual
    // `previous()` keeps stepping back instead of bouncing forward.
    const target =
      this.items.length <= 1 ? index : this.wrap(index + this.direction)
    this.advanceTimer = window.setTimeout(() => {
      this.requestTransition(target)
    }, SKIP_DELAY_MS)
  }

  private isHidden(): boolean {
    return (
      typeof document !== 'undefined' && document.visibilityState === 'hidden'
    )
  }

  /**
   * When the page returns from a hidden (throttled) state, the gap while hidden
   * is not a real stall: rebase the watchdog baseline and clear the report flag
   * so the loop gets a fresh grace window to resume.
   */
  private readonly handleVisibility = (): void => {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
      return
    }
    this.lastAdvanceAt = Date.now()
    this.stallReported = false
  }

  private startWatchdog(): void {
    if (this.watchdogTimer !== undefined) {
      return
    }
    this.watchdogTimer = window.setInterval(() => {
      if (this.destroyed || this.items.length === 0 || this.lastAdvanceAt === 0) {
        return
      }
      // While the page is hidden the browser throttles our timers and pauses
      // media, so the loop legitimately doesn't advance — that gap is not a
      // stall. visibilitychange rebases the baseline when we come back.
      if (this.isHidden()) {
        return
      }
      const stalledFor = Date.now() - this.lastAdvanceAt
      if (stalledFor > this.currentDurationMs + WATCHDOG_GRACE_MS) {
        // Report the stall once per episode, not every tick — a persistent
        // stall (e.g. offline with the next items not yet cached) would
        // otherwise spam a fresh, ever-growing error every interval. The flag
        // resets on the next successful swap.
        if (!this.stallReported) {
          this.stallReported = true
          const current = this.items[this.cursor]
          this.callbacks.onError?.(
            new Error(
              `playback stalled for ${String(stalledFor)}ms ` +
                `(item=${current?.id ?? '?'}:${current?.kind ?? '?'} ` +
                `cursor=${String(this.cursor)} ` +
                `transitioning=${String(this.transitioning)})`,
            ),
          )
        }
        this.advance()
      }
    }, WATCHDOG_INTERVAL_MS)
  }

  private clearAdvanceTimer(): void {
    if (this.advanceTimer !== undefined) {
      window.clearTimeout(this.advanceTimer)
      this.advanceTimer = undefined
    }
  }

  private clearPreloadTimer(): void {
    if (this.preloadTimer !== undefined) {
      window.clearTimeout(this.preloadTimer)
      this.preloadTimer = undefined
    }
  }

  private surface(): Surface {
    return {
      width: this.root.clientWidth,
      height: this.root.clientHeight,
    }
  }
}
