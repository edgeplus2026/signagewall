import { type AppHostHandle, mountAppHost } from '../apps/host-bridge'
import { config } from '../config'
import type { Renderable } from '../types'

const LOAD_TIMEOUT_MS = 12_000

export interface Surface {
  width: number
  height: number
}

/**
 * One A/B rendering layer. Each slot owns a pooled `<img>`, `<video>` and an app
 * mount host that are reused for the slot's entire lifetime — never created or
 * destroyed per item. This is the core defence against the memory/GC creep that
 * plagues long-running signage: content is swapped by setting/clearing sources,
 * not by churning DOM nodes.
 */
export class Slot {
  readonly el: HTMLDivElement
  private readonly img: HTMLImageElement
  private readonly video: HTMLVideoElement
  private readonly appHost: HTMLDivElement
  /** Live generic-iframe app host, if the current item is an app. */
  private appHostHandle: AppHostHandle | null = null
  private current: Renderable | null = null
  private endedHandler: (() => void) | null = null
  /** Playback volume 0–1, applied to the `<video>` element. */
  private volume = 1
  /**
   * Set when {@link activate} wanted sound (volume > 0) but the browser's
   * autoplay policy forced us to fall back to muted playback to keep the
   * picture. The very first video on a page without sticky user activation hits
   * this; {@link tryUnmute} clears it once we're allowed to enable sound (a user
   * gesture in a normal browser; immediately on a kiosk where it never trips).
   */
  private wantsAudioButMuted = false
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
  async prepare(item: Renderable, _surface: Surface, volume: number): Promise<void> {
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

  /** Makes the (already prepared) content visible and starts playback. */
  activate(onEnded: () => void): void {
    this.el.classList.add('is-active')

    if (this.current?.kind === 'video') {
      this.endedHandler = onEnded
      this.video.onended = () => this.endedHandler?.()
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
   * Starts the visual fade-out by dropping `is-active`, without yet tearing down
   * any media. Lets the outgoing slot cross-fade under the incoming one; call
   * {@link release} once the transition has finished to reclaim its buffers.
   */
  deactivate(): void {
    this.el.classList.remove('is-active')
  }

  /** Hides the slot and frees all decoded media buffers it was holding. */
  release(): void {
    this.prepareSeq += 1
    this.el.classList.remove('is-active')
    this.endedHandler = null
    this.video.onended = null
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
        this.video.removeEventListener('canplaythrough', onReady)
        this.video.removeEventListener('error', onError)
      }

      // Load muted as an autoplay-safe baseline; activate() sets the real
      // muted/volume just before play().
      this.video.muted = true
      this.video.volume = this.volume
      this.video.addEventListener('canplaythrough', onReady, { once: true })
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
