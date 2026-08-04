import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { VideoRenderable } from '../types'

/**
 * What happens to a video AFTER it is on screen.
 *
 * Nothing watched it before. `prepareVideo`'s error listener is `{ once: true }`
 * and removed the moment the item is ready, and `activate` wired only `onended` —
 * so a decode failure mid-playback froze the frame, and the only backstop was a
 * stall watchdog whose patience is proportional to the clip's own length. A
 * ten-minute video bought ten minutes of a still image on a shop wall.
 *
 * That is not hypothetical on this hardware: the TV's software H.264 decoder
 * SEGV-crashed five times in a single night of ordinary playback, because every
 * portrait video exceeds the 1088-pixel height ceiling of every hardware decoder
 * on the box and falls back to software.
 */

const setActive = vi.fn()

vi.mock('../apps/host-bridge', () => ({
  mountAppHost: () => ({
    iframe: {} as HTMLIFrameElement,
    ready: Promise.resolve(),
    setActive,
    dispose: vi.fn(),
  }),
}))

/** Handlers the slot attaches with addEventListener, so a test can fire them. */
const listeners = new Map<string, Set<(event?: unknown) => void>>()

function stubDom(): void {
  const element = (): unknown => {
    const attrs: Record<string, string> = {}
    return {
      className: '',
      style: {},
      dataset: {},
      muted: false,
      volume: 1,
      playsInline: false,
      preload: '',
      paused: false,
      ended: false,
      currentTime: 0,
      onended: null,
      decoding: '',
      duration: 30,
      readyState: 4,
      offsetWidth: 0,
      classList: { add: vi.fn(), remove: vi.fn() },
      setAttribute: (k: string, v: string) => {
        attrs[k] = v
      },
      getAttribute: (k: string) => attrs[k] ?? null,
      removeAttribute: (k: string) => {
        delete attrs[k]
      },
      addEventListener: (type: string, fn: (event?: unknown) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set())
        listeners.get(type)?.add(fn)
      },
      removeEventListener: (type: string, fn: (event?: unknown) => void) => {
        listeners.get(type)?.delete(fn)
      },
      append: vi.fn(),
      appendChild: vi.fn(),
      remove: vi.fn(),
      load: vi.fn(),
      pause: vi.fn(function (this: { paused: boolean }) {
        this.paused = true
      }),
      play: vi.fn(function (this: { paused: boolean }) {
        this.paused = false
        return Promise.resolve()
      }),
      decode: vi.fn(() => Promise.resolve()),
    }
  }
  ;(globalThis as { document?: unknown }).document = {
    createElement: () => element(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    visibilityState: 'visible',
  }
}

const VIDEO: VideoRenderable = {
  id: 'video-1',
  kind: 'video',
  url: 'https://example.test/clip.mp4',
  durationMs: 30_000,
}

function fire(type: string): void {
  listeners.get(type)?.forEach((fn) => fn())
}

/** A prepared, on-screen video slot. `prepare` resolves off a `canplay`-style
 *  event in the real slot, so the readiness listeners are fired here. */
async function activeVideoSlot(onFailed: (reason: string) => void) {
  const { Slot } = await import('./slot')
  const slot = new Slot()
  const prepared = slot.prepare(VIDEO, 1)
  fire('loadeddata')
  fire('canplaythrough')
  await prepared
  slot.activate(() => undefined, 1, onFailed)
  return slot
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  listeners.clear()
  stubDom()
})

afterEach(() => {
  vi.useRealTimers()
  delete (globalThis as { document?: unknown }).document
})

describe('a video that fails while on screen', () => {
  /** The raised-error case: a decoder that dies loudly. */
  it('reports a decode error to the loop', async () => {
    const onFailed = vi.fn()
    await activeVideoSlot(onFailed)

    fire('error')

    expect(onFailed).toHaveBeenCalledWith('decode error')
  })

  /**
   * The commoner and nastier case. A software codec that dies usually raises
   * nothing at all — it just stops producing frames, which is indistinguishable
   * from a healthy still image unless somebody is watching `currentTime`.
   */
  it('reports a frozen picture even when no error is raised', async () => {
    const onFailed = vi.fn()
    await activeVideoSlot(onFailed)

    // Ten seconds of "playing" with the picture standing still.
    await vi.advanceTimersByTimeAsync(10_000)

    expect(onFailed).toHaveBeenCalledWith('no progress')
  })

  /** A video that is actually playing must never be declared dead. */
  it('leaves a healthy video alone', async () => {
    const onFailed = vi.fn()
    const slot = await activeVideoSlot(onFailed)
    const video = (slot as unknown as { video: { currentTime: number } }).video

    for (let i = 0; i < 6; i += 1) {
      video.currentTime += 2
      await vi.advanceTimersByTimeAsync(2_000)
    }

    expect(onFailed).not.toHaveBeenCalled()
  })

  /** A paused video is not a stalled one — the watchdog must not fire on standby. */
  it('leaves a paused video alone', async () => {
    const onFailed = vi.fn()
    const slot = await activeVideoSlot(onFailed)
    const video = (slot as unknown as { video: { paused: boolean } }).video
    video.paused = true

    await vi.advanceTimersByTimeAsync(30_000)

    expect(onFailed).not.toHaveBeenCalled()
  })
})

describe('a video leaving the screen', () => {
  /**
   * It used to keep playing off-screen: `deactivate` handled apps and left video
   * to `release()`, which runs a whole transition later — or, on a one-item or
   * offline playlist, a whole item later. The audio talked over the incoming item
   * and the element kept holding one of the box's two hardware decoders.
   */
  it('is paused and unhooked immediately', async () => {
    const slot = await activeVideoSlot(vi.fn())
    const video = (slot as unknown as {
      video: { paused: boolean; pause: () => void; onended: unknown }
    }).video

    slot.deactivate(1)

    expect(video.pause).toHaveBeenCalled()
    expect(video.onended).toBeNull()
  })

  /** And its stall watchdog stops with it, so a slot parked off screen cannot
   *  report a failure for an item that is no longer showing. */
  it('stops reporting once it is off screen', async () => {
    const onFailed = vi.fn()
    const slot = await activeVideoSlot(onFailed)

    slot.deactivate(1)
    await vi.advanceTimersByTimeAsync(30_000)

    expect(onFailed).not.toHaveBeenCalled()
  })
})
