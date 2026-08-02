import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppRenderable } from '../types'

/**
 * How an app item recovers the sound the browser refused it.
 *
 * An app's audio lives behind an iframe boundary: the slot cannot unmute it, and
 * the app never sees the user's tap, because the gesture lands on the player's
 * document. All the slot can do is re-send `active/muted` from inside the
 * activation and let the app try again — so what is worth pinning down is
 * exactly *when* it does that, and when it stays quiet.
 */

const setActive = vi.fn()
const dispose = vi.fn()

vi.mock('../apps/host-bridge', () => ({
  mountAppHost: () => ({
    iframe: {} as HTMLIFrameElement,
    ready: Promise.resolve(),
    setActive,
    dispose,
  }),
}))

/** The handful of DOM calls the slot's constructor and `show`/`hide` make. */
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
      paused: true,
      onended: null,
      decoding: '',
      duration: NaN,
      classList: { add: vi.fn(), remove: vi.fn() },
      setAttribute: (k: string, v: string) => {
        attrs[k] = v
      },
      getAttribute: (k: string) => attrs[k] ?? null,
      removeAttribute: (k: string) => {
        delete attrs[k]
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      append: vi.fn(),
      appendChild: vi.fn(),
      remove: vi.fn(),
      load: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(() => Promise.resolve()),
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

const APP_ITEM: AppRenderable = {
  id: 'app-1',
  kind: 'app',
  slug: 'youtube',
  config: { url: 'https://youtu.be/x' },
  durationMs: 10_000,
}

/** A prepared, on-screen app slot at `volume`. */
async function activeAppSlot(volume: number) {
  const { Slot } = await import('./slot')
  const slot = new Slot()
  await slot.prepare(APP_ITEM, volume)
  slot.activate(() => undefined)
  setActive.mockClear()
  return slot
}

beforeEach(() => {
  vi.resetModules()
  setActive.mockClear()
  dispose.mockClear()
  stubDom()
})

afterEach(() => {
  delete (globalThis as { document?: unknown }).document
})

describe('Slot.tryUnmute for an app item', () => {
  it('re-sends an unmuted directive on the first gesture', async () => {
    const slot = await activeAppSlot(1)

    slot.tryUnmute()

    expect(setActive).toHaveBeenCalledWith(true, false)
  })

  // The video path clears its flag up front for the same reason: a screen that
  // simply is not allowed audio must not re-enter playback on every tap.
  it('only tries once per activation', async () => {
    const slot = await activeAppSlot(1)

    slot.tryUnmute()
    slot.tryUnmute()
    slot.tryUnmute()

    expect(setActive).toHaveBeenCalledTimes(1)
  })

  it('stays quiet on a muted screen — there is no sound to recover', async () => {
    const slot = await activeAppSlot(0)

    slot.tryUnmute()

    expect(setActive).not.toHaveBeenCalled()
  })

  // A hidden preloaded app is silent anyway, and telling it otherwise would let
  // it sound over the item still on screen.
  it('stays quiet for an app that is not on screen', async () => {
    const { Slot } = await import('./slot')
    const slot = new Slot()
    await slot.prepare(APP_ITEM, 1)
    setActive.mockClear()

    slot.tryUnmute()

    expect(setActive).not.toHaveBeenCalled()
  })

  it('stays quiet once the app has left the screen', async () => {
    const slot = await activeAppSlot(1)
    slot.deactivate()
    setActive.mockClear()

    slot.tryUnmute()

    expect(setActive).not.toHaveBeenCalled()
  })

  // Raising the volume is itself an unmute the browser may refuse, so the next
  // gesture has to be able to follow it up.
  it('re-arms when the volume is raised on a live app', async () => {
    const slot = await activeAppSlot(0)
    slot.tryUnmute()
    expect(setActive).not.toHaveBeenCalled()

    slot.setVolume(1)
    setActive.mockClear()
    slot.tryUnmute()

    expect(setActive).toHaveBeenCalledWith(true, false)
  })
})
