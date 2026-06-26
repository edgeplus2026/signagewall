import { render } from 'preact'

import { renderApp } from '../apps/registry'
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
  private current: Renderable | null = null
  private endedHandler: (() => void) | null = null
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
   * Loads `item` into this (hidden) slot. Resolves only once the content is
   * decoded/buffered enough to show without a flash. Rejects on load error or
   * timeout so the controller can skip the item instead of blocking the loop.
   */
  async prepare(item: Renderable, surface: Surface, muted: boolean): Promise<void> {
    this.release()
    const seq = this.prepareSeq
    this.current = item

    if (item.kind === 'image') {
      await this.prepareImage(item.url, seq)
      return
    }
    if (item.kind === 'video') {
      await this.prepareVideo(item.url, muted, seq)
      return
    }
    this.prepareApp(item, surface)
  }

  /**
   * Applies the audio-unlock state to a video that is already playing, so the
   * unlock gesture un-mutes the current clip immediately rather than only from
   * the next item. No-op for non-video content.
   */
  setMuted(muted: boolean): void {
    if (this.current?.kind === 'video') {
      this.video.muted = muted
    }
  }

  /** Makes the (already prepared) content visible and starts playback. */
  activate(onEnded: () => void): void {
    this.el.classList.add('is-active')

    if (this.current?.kind === 'video') {
      this.endedHandler = onEnded
      this.video.onended = () => this.endedHandler?.()
      try {
        this.video.currentTime = 0
      } catch {
        // Some sources disallow seeking before play; safe to ignore.
      }
      void this.video.play().catch(() => {
        // Autoplay can be blocked until the audio-unlock gesture; the
        // controller's duration timer still advances the loop.
      })
    }
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
    render(null, this.appHost)
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

  private prepareVideo(url: string, muted: boolean, seq: number): Promise<void> {
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

      this.video.muted = muted
      this.video.addEventListener('canplaythrough', onReady, { once: true })
      this.video.addEventListener('error', onError, { once: true })
      this.video.src = url
      this.video.load()
    })
  }

  private prepareApp(item: Renderable, surface: Surface): void {
    if (item.kind !== 'app') {
      return
    }
    const ok = renderApp(this.appHost, item, surface)
    if (!ok) {
      throw new Error(`unknown app: ${item.slug}`)
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
