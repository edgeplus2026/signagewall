import { type AppHostHandle, mountAppHost } from '../apps/host-bridge'
import { config } from '../config'
import type { Renderable } from '../types'

const LOAD_TIMEOUT_MS = 12_000

/**
 * The event that counts as "this video is ready to go on screen".
 *
 * Deliberately `canplay` (HAVE_FUTURE_DATA) and not `canplaythrough`
 * (HAVE_ENOUGH_DATA). `canplaythrough` is not a guarantee — it is the browser
 * GUESSING that the whole clip will arrive faster than it plays — and paying for
 * that guess means holding the previous item on screen until enough of the file
 * has buffered. Measured on a real screen: a 34MB, 48s, 5.6Mbit/s clip served
 * from a non-CDN bucket at ~1.5MB/s took NINE SECONDS to reach it.
 *
 * `canplay` means the browser can start playing now. If the download then falls
 * behind, the picture stops moving and {@link Slot.startProgressWatchdog} — which
 * exists precisely because a stalled decoder produces no error — declares the item
 * dead and the loop moves on. A stall detected in ~8s beats a guaranteed 9s wait
 * on every cold video, and the two failure modes are handled by the same code.
 */
const READY_EVENT = 'canplay'

/**
 * Forces the element's pending style changes to be applied, so a transition
 * started right after begins from them rather than from the previous frame.
 * Reading a layout property is what does it; the value is deliberately unused.
 */
function flushPendingStyle(element: HTMLElement): void {
  void element.offsetWidth
}

/**
 * One A/B rendering layer. Each slot owns a pooled `<img>`, `<video>` and an app
 * mount host that are reused for the slot's entire lifetime — never created or
 * destroyed per item. This is the core defence against the memory/GC creep that
 * plagues long-running signage: content is swapped by setting/clearing sources,
 * not by churning DOM nodes.
 */
/** How often the progress watchdog samples. */
const PROGRESS_SAMPLE_MS = 2_000
/** Below this, a `currentTime` change is float noise rather than playback. */
const PROGRESS_EPSILON_S = 0.05
/** Consecutive stalled samples before the item is declared dead — ~8s at the
 *  sample rate above. Long enough to survive a buffering hiccup on a slow
 *  connection, short enough that a frozen item is off screen inside ten seconds
 *  instead of standing there for the clip's whole nominal length. */
const NO_PROGRESS_SAMPLES = 4

export class Slot {
  readonly el: HTMLDivElement
  private readonly img: HTMLImageElement
  private readonly video: HTMLVideoElement
  private readonly appHost: HTMLDivElement
  /** Live generic-iframe app host, if the current item is an app. */
  private appHostHandle: AppHostHandle | null = null
  private current: Renderable | null = null
  private endedHandler: (() => void) | null = null
  /**
   * Called when the on-screen video stops being viable — a decode error, or
   * simply no forward progress. Nothing supervised playback between activate()
   * and release() before: `prepareVideo`'s error listener is `{ once: true }` and
   * removed as soon as the item is ready, so a mid-playback failure froze the
   * frame and the only backstop was a stall watchdog whose patience is
   * proportional to the clip's full length. On hardware whose software H.264
   * decoder SEGVs — measured five times in one night — that is the difference
   * between a ten-second gap and an advert stuck on screen until closing time.
   */
  private failedHandler: ((reason: string) => void) | null = null
  private progressTimer: ReturnType<typeof setInterval> | undefined
  private lastProgressTime = 0
  /** Consecutive samples that saw no forward progress. Counted rather than timed
   *  because wall-clock deltas are hostage to an NTP step, and a clock that jumps
   *  backwards would silently disable this watchdog on exactly the unattended
   *  devices that need it. */
  private stalledSamples = 0
  /** Instance handler (not `once`), so it is removed deterministically in
   *  {@link release} rather than consumed by the first event. */
  private readonly onPlaybackError = (): void => {
    this.reportFailure('decode error')
  }

  /**
   * Reports a failure exactly ONCE per activation. A dying decoder usually raises
   * `error` AND stops producing frames, so both detectors fire — and the second
   * report reached the loop after it had already begun loading the replacement,
   * discarding that in-flight load and starting another. Handing the handler over
   * and clearing it makes the first report the only one.
   */
  private reportFailure(reason: string): void {
    const handler = this.failedHandler
    this.failedHandler = null
    this.stopProgressWatchdog()
    handler?.(reason)
  }
  /** Playback volume 0–1, applied to the `<video>` element. */
  private volume = 1
  /**
   * True while an app item is the on-screen (active) item — i.e. between
   * {@link activate} and {@link release}. Gates pushing live audio (mute) changes
   * to the app: a hidden/preloaded app is silent regardless, so only the active
   * one needs them.
   */
  private appActive = false
  /**
   * Set when {@link activate} wanted sound (volume > 0) but the browser's
   * autoplay policy forced us to fall back to muted playback to keep the
   * picture. The very first video on a page without sticky user activation hits
   * this; {@link tryUnmute} clears it once we're allowed to enable sound (a user
   * gesture in a normal browser; immediately on a kiosk where it never trips).
   */
  private wantsAudioButMuted = false
  /**
   * The app-item counterpart of {@link wantsAudioButMuted}: set when an app was
   * put on screen with sound wanted.
   *
   * An app owns its audio inside its iframe, so we never learn whether the
   * browser actually let it start unmuted — and the app never learns that the
   * user touched the screen, because the gesture lands on the player's document.
   * Remembering that this one was meant to be audible lets {@link tryUnmute}
   * re-send the directive on the first gesture, which is the app's cue to try
   * again from inside a user activation. Cleared after one attempt, exactly like
   * the video flag, so a screen that simply is not allowed audio doesn't re-try
   * on every subsequent tap.
   */
  private appOwesAudioRetry = false
  /**
   * Bumped on every {@link prepare}/{@link release}. Async prepare work (image
   * decode + retry, video readiness) captures the seq at start and bails if it
   * no longer matches — so a superseded load never paints into, or rejects, a
   * slot that a newer prepare has already re-pointed at different content.
   */
  private prepareSeq = 0

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'player-slot'

    this.img = document.createElement('img')
    this.img.className = 'player-media'
    this.img.decoding = 'async'

    this.video = document.createElement('video')
    this.video.className = 'player-media'
    this.video.muted = true
    this.video.playsInline = true
    this.video.preload = 'auto'
    this.video.setAttribute('playsinline', '')

    this.appHost = document.createElement('div')
    this.appHost.className = 'player-app'

    this.hideAll()
    this.el.append(this.img, this.video, this.appHost)
  }

  /** Id of the renderable currently loaded into this slot (for preload checks). */
  get preparedId(): string | null {
    return this.current?.id ?? null
  }

  /**
   * Real decoded duration (ms) of the loaded video, or null when unknown or the
   * slot isn't showing a video. Lets the controller key its dwell/watchdog on
   * the actual length rather than trusting (possibly stale) snapshot metadata.
   */
  mediaDurationMs(): number | null {
    if (this.current?.kind !== 'video') {
      return null
    }
    const seconds = this.video.duration
    return Number.isFinite(seconds) && seconds > 0
      ? Math.round(seconds * 1000)
      : null
  }

  /**
   * Loads `item` into this (hidden) slot. Resolves only once the content is
   * decoded/buffered enough to show without a flash. Rejects on load error or
   * timeout so the controller can skip the item instead of blocking the loop.
   */
  async prepare(item: Renderable, volume: number): Promise<void> {
    this.release()
    const seq = this.prepareSeq
    this.current = item
    this.volume = Math.min(1, Math.max(0, volume))

    if (item.kind === 'image') {
      await this.prepareImage(item.url, seq)
      return
    }
    if (item.kind === 'video') {
      await this.prepareVideo(item.url, seq)
      return
    }
    await this.prepareApp(item, seq)
  }

  /**
   * Live volume change applied to the on-screen video. `volume` is always safe;
   * the mute state tracks `volume === 0`. Unmuting a playing element without
   * prior user activation makes the browser pause it — so when that happens we
   * recover by resuming muted, keeping the picture alive. On a real signage
   * device (autoplay-with-sound allowed) the unmute simply sticks and sound
   * returns immediately.
   */
  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
    // An app owns its audio inside an iframe, so the screen volume can't reach it
    // through a `<video>` element — push the mute state (volume 0 ⇒ muted) over
    // the handshake instead. Only the active app is audible; a hidden one is
    // silent already, so skip it (and avoid a needless postMessage).
    if (this.current?.kind === 'app') {
      if (this.appActive) {
        // Raising the volume on a live app is another unmute that the browser may
        // refuse, so re-arm the gesture retry alongside the directive.
        this.appOwesAudioRetry = this.volume > 0
        this.appHostHandle?.setActive(true, this.volume === 0)
      }
      return
    }
    if (this.current?.kind !== 'video') {
      return
    }
    this.video.volume = this.volume
    const shouldMute = this.volume === 0
    if (this.video.muted === shouldMute) {
      return
    }
    const wasPlaying = !this.video.paused
    this.video.muted = shouldMute
    // Muting is always safe. Unmuting a *playing* element without prior user
    // activation makes the browser pause it — and that pause can be async, so a
    // synchronous `paused` check misses it. Re-assert playback and fall back to
    // muted if the unmute wasn't permitted (same recovery as activate()). A
    // prepared-but-paused back slot stays paused — never start hidden media.
    if (!shouldMute && wasPlaying) {
      void this.video.play().catch(() => {
        this.video.muted = true
        void this.video.play().catch(() => undefined)
      })
    }
  }

  /**
   * Makes the (already prepared) content visible and starts playback. `direction`
   * is the loop's direction of travel and only steers the slide: the slot is
   * stamped with it *before* it moves, so a later reversal cannot re-aim a
   * transition that is already under way.
   */
  activate(
    onEnded: () => void,
    direction: 1 | -1 = 1,
    onFailed?: (reason: string) => void,
  ): void {
    this.failedHandler = onFailed ?? null
    this.el.dataset.direction = direction === -1 ? 'back' : 'forward'
    // Commit that resting offset BEFORE asking the slot to move. Both changes in
    // one go are coalesced into a single style recalculation, so the slide would
    // start from wherever the slot was last parked — a back-step would enter from
    // the right while the outgoing item also left to the right, and the two would
    // cross. `deactivate` needs no such flush: its start point is the centre
    // either way.
    flushPendingStyle(this.el)
    this.el.classList.add('is-active')

    // Apps are preloaded silent (see host-bridge): tell this one it is now the
    // on-screen item so a media app (e.g. YouTube) may start playback — muting it
    // iff the screen volume is 0. Without this a preloaded app would either never
    // play or — worse — the hidden preload would have played audio while the
    // previous item was still up.
    if (this.current?.kind === 'app') {
      this.appActive = true
      this.appOwesAudioRetry = this.volume > 0
      this.appHostHandle?.setActive(true, this.volume === 0)
    }

    if (this.current?.kind === 'video') {
      this.endedHandler = onEnded
      // Guarded by identity: a stale `ended` from the item we just left must not
      // force the playlist forward a second time.
      const owner = this.current.id
      this.video.onended = () => {
        if (this.current?.id === owner) {
          this.endedHandler?.()
        }
      }
      this.video.addEventListener('error', this.onPlaybackError)
      this.startProgressWatchdog()
      this.wantsAudioButMuted = false
      try {
        this.video.currentTime = 0
      } catch {
        // Some sources disallow seeking before play; safe to ignore.
      }
      // Set the audio state *before* play() — never unmute a playing element.
      this.video.volume = this.volume
      this.video.muted = this.volume === 0
      void this.video.play().catch(() => {
        // Autoplay with sound needs a user gesture / kiosk flag; without it the
        // play() rejects (cleanly, no "unmuting paused" warning). Guarantee the
        // picture by falling back to muted playback — but remember we owe sound,
        // so the next user gesture (or kiosk unmute) can restore it. Without this
        // the *first* video on the page would stay silent forever even though
        // its volume is 100%.
        if (!this.video.muted) {
          this.wantsAudioButMuted = true
          this.video.muted = true
          void this.video.play().catch(() => undefined)
        }
      })
    }
  }

  /**
   * Restores sound on a video that {@link activate} had to fall back to muted
   * (the first-video autoplay case). Called on the first user gesture in a
   * normal browser; a no-op once sound is already on.
   *
   * We must not flip `muted = false` on the *playing* element: if the gesture
   * didn't actually grant audio permission, the browser pauses the element and
   * logs "Unmuting failed and the element was paused…". Instead we re-enter
   * playback cleanly — pause, unmute while paused, then `play()`. That play()
   * runs in the gesture's call stack, so it either resumes *with* sound (the
   * common case) or rejects, in which case we restore muted playback. Either
   * way the browser never emits the unmute-paused warning.
   */
  tryUnmute(): void {
    // An app's audio lives behind an iframe boundary, so there is nothing here to
    // unmute — only a directive to re-send. Repeating it *now*, inside the user
    // activation, is what gives a media app (YouTube, a stream) the one chance it
    // has to turn its sound on; every `onActive` handler treats a repeat with
    // unchanged values as a no-op, so nothing restarts.
    if (this.current?.kind === 'app') {
      if (!this.appOwesAudioRetry || !this.appActive || this.volume === 0) {
        return
      }
      this.appOwesAudioRetry = false
      this.appHostHandle?.setActive(true, false)
      return
    }
    if (
      !this.wantsAudioButMuted ||
      this.current?.kind !== 'video' ||
      this.volume === 0
    ) {
      return
    }
    // Clear up front so a play() rejection below doesn't re-arm an unmute loop
    // on every subsequent gesture.
    this.wantsAudioButMuted = false
    const resumeAt = this.video.currentTime
    this.video.pause()
    this.video.volume = this.volume
    this.video.muted = false
    void this.video.play().catch(() => {
      // Still no audio permission — keep the picture by resuming muted.
      this.video.muted = true
      try {
        this.video.currentTime = resumeAt
      } catch {
        // Seeking may be disallowed mid-stream; resuming from the current
        // position is an acceptable fallback.
      }
      void this.video.play().catch(() => undefined)
    })
  }

  /**
   * Starts the visual exit — the slot slides off the edge opposite the one the
   * incoming slot came from — without yet tearing down any media. Call
   * {@link release} once the transition has finished to reclaim its buffers.
   * `direction` must match the one handed to the incoming slot's
   * {@link activate}, so the two move as a single gesture.
   */
  deactivate(direction: 1 | -1 = 1): void {
    this.el.dataset.direction = direction === -1 ? 'back' : 'forward'
    this.el.classList.remove('is-active')
    this.el.classList.add('is-leaving')
    // Tell an outgoing APP it is no longer on screen so it stops its audio now,
    // at the start of the transition — otherwise `active:false` was never sent and
    // the app kept sounding until `release()` disposed its iframe ~TRANSITION_MS
    // (or, for a 1-item/offline playlist, a whole item) later, audibly overlapping
    // the incoming item. Video is paused by release(); an image is silent.
    if (this.current?.kind === 'app' && this.appActive) {
      this.appActive = false
      this.appOwesAudioRetry = false
      this.appHostHandle?.setActive(false, this.volume === 0)
    }

    // An outgoing VIDEO needs the same courtesy, and did not get it: it kept
    // playing off-screen with its audio audible over the incoming item until
    // release() disposed it — a whole item later on a one-item or offline
    // playlist. It also kept holding a decoder, on hardware that has two.
    if (this.current?.kind === 'video') {
      this.endedHandler = null
      this.failedHandler = null
      this.video.onended = null
      this.stopProgressWatchdog()
      // Clearing the audio-retry intent matters as much as the pause: `tryUnmute`
      // calls play() on a slot that still owes sound, and an outgoing slot that
      // still owed it would be started again the moment the next user gesture (or
      // kiosk unmute) arrived — un-doing this pause and putting its audio back over
      // the incoming item.
      this.wantsAudioButMuted = false
      if (!this.video.paused) {
        this.video.pause()
      }
    }
  }

  /**
   * Watches the picture actually move.
   *
   * A software decoder that dies usually raises no `error` at all — it simply
   * stops producing frames, which looks identical to a paused video and to a
   * perfectly healthy still image. `currentTime` standing still while the element
   * believes it is playing is the only reliable symptom, so that is what this
   * samples. Cheap: two number reads every two seconds.
   */
  private startProgressWatchdog(): void {
    this.stopProgressWatchdog()
    this.lastProgressTime = this.video.currentTime
    this.stalledSamples = 0
    this.progressTimer = setInterval(() => {
      // A paused or finished video is not a stalled one — standby and the moment
      // between `ended` and the swap both land here legitimately.
      if (this.video.paused || this.video.ended) {
        this.stalledSamples = 0
        return
      }
      if (this.video.currentTime > this.lastProgressTime + PROGRESS_EPSILON_S) {
        this.lastProgressTime = this.video.currentTime
        this.stalledSamples = 0
        return
      }
      this.stalledSamples += 1
      if (this.stalledSamples >= NO_PROGRESS_SAMPLES) {
        this.reportFailure('no progress')
      }
    }, PROGRESS_SAMPLE_MS)
  }

  private stopProgressWatchdog(): void {
    if (this.progressTimer !== undefined) {
      clearInterval(this.progressTimer)
      this.progressTimer = undefined
    }
  }

  /** Hides the slot and frees all decoded media buffers it was holding. */
  release(): void {
    this.prepareSeq += 1
    // Dropping `is-leaving` returns the slot to its resting offset, ready to
    // enter again. The resting style carries no transition precisely so this
    // snaps instead of sliding the slot back across the screen.
    this.el.classList.remove('is-active')
    this.el.classList.remove('is-leaving')
    this.endedHandler = null
    this.failedHandler = null
    this.video.onended = null
    this.video.removeEventListener('error', this.onPlaybackError)
    this.stopProgressWatchdog()
    this.wantsAudioButMuted = false

    if (!this.video.paused) {
      this.video.pause()
    }
    if (this.video.getAttribute('src')) {
      this.video.removeAttribute('src')
      this.video.load()
    }
    if (this.img.getAttribute('src')) {
      this.img.removeAttribute('src')
    }
    if (this.appHostHandle) {
      this.appHostHandle.dispose()
      this.appHostHandle = null
    }
    this.appActive = false
    this.appOwesAudioRetry = false
    this.hideAll()
    this.current = null
  }

  private async prepareImage(url: string, seq: number): Promise<void> {
    try {
      await this.loadAndDecode(url, seq)
    } catch (error) {
      // A newer prepare took over this pooled slot mid-load — stop, or the
      // retry below would re-point the shared <img> at this (stale) url.
      if (this.prepareSeq !== seq) {
        return
      }
      // Don't retry a timeout — the source is slow/stuck, so a second 12s wait
      // just stalls the loop. Retry only fast decode failures (network blip,
      // partial bytes, a GPU hiccup), which usually succeed on a second pass.
      if (error instanceof Error && error.message === 'image load timeout') {
        throw error
      }
      await this.loadAndDecode(url, seq)
    }
  }

  private loadAndDecode(url: string, seq: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('image load timeout')),
        LOAD_TIMEOUT_MS,
      )
      // Clear first so reassigning the same url on a retry forces a fresh decode.
      this.img.removeAttribute('src')
      this.img.src = url
      this.img
        .decode()
        .then(() => {
          window.clearTimeout(timeout)
          // Superseded mid-decode — don't paint stale content into the slot.
          if (this.prepareSeq !== seq) {
            resolve()
            return
          }
          this.show(this.img)
          resolve()
        })
        .catch((error: unknown) => {
          window.clearTimeout(timeout)
          reject(error instanceof Error ? error : new Error('image decode failed'))
        })
    })
  }

  private prepareVideo(url: string, seq: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup()
        reject(new Error('video load timeout'))
      }, LOAD_TIMEOUT_MS)

      const onReady = (): void => {
        cleanup()
        // Superseded — a stale readiness/error must not paint or reject the
        // prepare that has since taken over the shared <video>.
        if (this.prepareSeq !== seq) {
          resolve()
          return
        }
        this.show(this.video)
        resolve()
      }
      const onError = (): void => {
        cleanup()
        if (this.prepareSeq !== seq) {
          resolve()
          return
        }
        reject(new Error('video load error'))
      }
      const cleanup = (): void => {
        window.clearTimeout(timeout)
        this.video.removeEventListener(READY_EVENT, onReady)
        this.video.removeEventListener('error', onError)
      }

      // Load muted as an autoplay-safe baseline; activate() sets the real
      // muted/volume just before play().
      this.video.muted = true
      this.video.volume = this.volume
      this.video.addEventListener(READY_EVENT, onReady, { once: true })
      this.video.addEventListener('error', onError, { once: true })
      this.video.src = url
      this.video.load()
    })
  }

  /**
   * Mounts the generic iframe app host and resolves only once the app bundle
   * announces `app-ready` (or rejects on load timeout/error) — the same
   * readiness gating image/video get, so the controller never reveals a blank
   * app frame. A superseded prepare (newer `prepareSeq`) disposes its own host
   * and returns without painting.
   */
  private async prepareApp(item: Renderable, seq: number): Promise<void> {
    if (item.kind !== 'app') {
      return
    }
    const handle = mountAppHost(this.appHost, item, {
      appsBase: config.appsBase,
      timeoutMs: LOAD_TIMEOUT_MS,
    })
    this.appHostHandle = handle

    try {
      await handle.ready
    } catch (error) {
      // Only tear down if we still own the slot; a newer prepare/release already
      // disposed (and possibly replaced) this handle otherwise.
      if (this.appHostHandle === handle) {
        handle.dispose()
        this.appHostHandle = null
      }
      throw error
    }

    // Superseded mid-handshake — drop this load without painting.
    if (this.prepareSeq !== seq) {
      handle.dispose()
      if (this.appHostHandle === handle) {
        this.appHostHandle = null
      }
      return
    }
    this.show(this.appHost)
  }

  private show(element: HTMLElement): void {
    this.img.style.display = element === this.img ? '' : 'none'
    this.video.style.display = element === this.video ? '' : 'none'
    this.appHost.style.display = element === this.appHost ? '' : 'none'
  }

  private hideAll(): void {
    this.img.style.display = 'none'
    this.video.style.display = 'none'
    this.appHost.style.display = 'none'
  }
}
