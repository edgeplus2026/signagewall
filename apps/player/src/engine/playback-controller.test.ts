import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerSnapshot, Renderable } from '../types'
import {
  PlaybackController,
  type ControllerOptions,
  type PlaybackSlot,
} from './playback-controller'

function img(id: string, durationMs = 2000): Renderable {
  return { id, kind: 'image', url: `https://cdn.test/${id}.webp`, durationMs }
}

function video(id: string, durationMs = 2000): Renderable {
  return { id, kind: 'video', url: `https://cdn.test/${id}.mp4`, durationMs }
}

/** A network-only app item (needs internet), per the injected test predicate. */
function app(id: string, durationMs = 2000): Renderable {
  return { id, kind: 'app', slug: 'net', config: {}, durationMs }
}

function snapshot(items: Renderable[], revision = 'r1'): PlayerSnapshot {
  return { screenId: 's', name: 'screen', revision, items }
}

/** Shared, test-controllable behaviour for both fake slots, keyed by item id. */
class FakeMedia {
  readonly failIds = new Set<string>()
  readonly hangIds = new Set<string>()
}

/**
 * A deterministic stand-in for the real pooled {@link PlaybackSlot}: prepare()
 * resolves on a microtask unless the item is marked to fail (reject) or hang
 * (never settle), so tests can drive the engine's epoch/single-flight loop
 * without any real `<img>`/`<video>` decode.
 */
class FakeSlot implements PlaybackSlot {
  readonly el: HTMLElement
  current: Renderable | null = null
  volume = 1

  constructor(private readonly media: FakeMedia) {
    this.el = { remove: () => undefined } as unknown as HTMLElement
  }

  prepare(item: Renderable): Promise<void> {
    this.current = item
    if (this.media.hangIds.has(item.id)) {
      return new Promise<void>(() => undefined)
    }
    if (this.media.failIds.has(item.id)) {
      return Promise.reject(new Error(`prepare failed: ${item.id}`))
    }
    return Promise.resolve()
  }

  activate(): void {
    // Crossfade reveal is a no-op for the loop logic under test.
  }

  deactivate(): void {
    // Fade-out is purely visual.
  }

  release(): void {
    // Buffer reclaim is irrelevant to the fake.
  }

  setVolume(volume: number): void {
    this.volume = volume
  }

  tryUnmute(): void {
    // Audio recovery is exercised at the Slot level, not the loop logic.
  }

  mediaDurationMs(): number | null {
    // No real <video>, so the loop falls back to snapshot metadata duration.
    return null
  }
}

function build(options: ControllerOptions = {}) {
  const media = new FakeMedia()
  const slots: FakeSlot[] = []
  const onItemIds: string[] = []
  const errors: { error: unknown; item?: Renderable }[] = []
  const root = {
    append: () => undefined,
    clientWidth: 1920,
    clientHeight: 1080,
  } as unknown as HTMLElement

  const controller = new PlaybackController(
    root,
    {
      onItem: (item) => onItemIds.push(item.id),
      onError: (error, item) => errors.push({ error, item }),
    },
    () => {
      const slot = new FakeSlot(media)
      slots.push(slot)
      return slot
    },
    // Treat every `app` item as network-only, so tests drive offline gating
    // deterministically without depending on the real manifest registry.
    { requiresNetwork: (item) => item.kind === 'app', ...options },
  )

  return { controller, media, slots, onItemIds, errors }
}

/** Drains pending prepare microtasks (no timer advance). */
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
  }
}

describe('PlaybackController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the first item on load', async () => {
    const { controller, onItemIds } = build()
    controller.load(snapshot([img('A'), img('B')]))
    await flush()
    expect(onItemIds).toEqual(['A'])
    controller.destroy()
  })

  it('auto-advances forward and wraps at the end', async () => {
    const { controller, onItemIds } = build()
    controller.load(snapshot([img('A'), img('B'), img('C')]))
    await flush()
    await vi.advanceTimersByTimeAsync(2000) // A -> B
    await vi.advanceTimersByTimeAsync(2000) // B -> C
    await vi.advanceTimersByTimeAsync(2000) // C -> A (wrap)
    expect(onItemIds).toEqual(['A', 'B', 'C', 'A'])
    controller.destroy()
  })

  it('previous() steps back, wrapping at the start', async () => {
    const { controller, onItemIds } = build()
    controller.load(snapshot([img('A'), img('B'), img('C')]))
    await flush()
    controller.previous()
    await flush()
    expect(onItemIds.at(-1)).toBe('C') // wrapped back from A
    controller.next()
    await flush()
    expect(onItemIds.at(-1)).toBe('A')
    controller.destroy()
  })

  it('collapses a burst of navigation to a single swap at the final target', async () => {
    const { controller, onItemIds, errors } = build()
    controller.load(snapshot([img('A'), img('B'), img('C'), img('D')]))
    await flush()
    // Fired synchronously before the first prepare resolves: each bumps the
    // epoch while a transition is in flight, so only the last target survives.
    // Each one still COUNTS, though — a burst steps as far as it was pressed,
    // rather than every press after the first re-computing from the same place.
    controller.next() // -> B
    controller.next() // -> C
    controller.previous() // -> B again, direction flips
    await flush()
    // Only the final target swaps in; C is never revealed.
    expect(onItemIds).toEqual(['A', 'B'])
    expect(errors).toHaveLength(0)
    controller.destroy()
  })

  // Modest hardware has a single video decode session — measured on an LG webOS
  // TV, where warming the next video paused the one on screen where it stood,
  // with no way to resume it. The back buffer stays cold for video-behind-video;
  // everything else still warms.
  it('leaves the back buffer cold rather than warm a video behind a video', async () => {
    const { controller, slots } = build()
    controller.load(snapshot([video('A'), video('B')]))
    await flush()
    await vi.advanceTimersByTimeAsync(600) // the preload window

    expect(slots[1]?.current?.id).toBe('A') // on screen
    expect(slots[0]?.current).toBeNull() // never prepared
    controller.destroy()
  })

  // Warming still happens behind a video, just later: touching the other slot
  // too soon after a video starts took its decode session down on real hardware.
  it('still warms a non-video item behind a video, after the settle delay', async () => {
    const { controller, slots } = build()
    controller.load(snapshot([video('A'), img('B')]))
    await flush()

    await vi.advanceTimersByTimeAsync(600)
    expect(slots[0]?.current).toBeNull() // the video is still settling

    await vi.advanceTimersByTimeAsync(3000)
    expect(slots[0]?.current?.id).toBe('B')
    controller.destroy()
  })

  it('still warms a video behind a non-video item', async () => {
    const { controller, slots } = build()
    controller.load(snapshot([img('A'), video('B')]))
    await flush()
    await vi.advanceTimersByTimeAsync(600)

    expect(slots[0]?.current?.id).toBe('B')
    controller.destroy()
  })

  // Skipping the warm-up must cost latency, never the item itself.
  it('still reaches the next video without the preload', async () => {
    const { controller, onItemIds } = build()
    controller.load(snapshot([video('A'), video('B')]))
    await flush()
    await vi.advanceTimersByTimeAsync(600)
    controller.next()
    await flush()

    expect(onItemIds).toEqual(['A', 'B'])
    controller.destroy()
  })

  it('skips a failed item forward under auto-advance', async () => {
    const { controller, media, onItemIds, errors } = build()
    media.failIds.add('B')
    controller.load(snapshot([img('A'), img('B'), img('C')]))
    await flush()
    await vi.advanceTimersByTimeAsync(2000) // A -> (B fails)
    await vi.advanceTimersByTimeAsync(250) // skip -> C
    // B is skipped, not shown; the failure is surfaced (a persistently broken
    // item can be reported by both the preload warm and the show attempt).
    expect(onItemIds).toEqual(['A', 'C'])
    expect(errors.some((e) => e.item?.id === 'B')).toBe(true)
    controller.destroy()
  })

  it('skips a failed item backward under previous()', async () => {
    const { controller, media, onItemIds, errors } = build()
    media.failIds.add('B')
    controller.load(snapshot([img('A'), img('B'), img('C')]))
    await flush()
    controller.previous() // A -> C (wrap)
    await flush()
    controller.previous() // C -> (B fails) -> skip backward -> A
    await vi.advanceTimersByTimeAsync(250)
    expect(onItemIds).toEqual(['A', 'C', 'A'])
    expect(errors[0]?.item?.id).toBe('B')
    controller.destroy()
  })

  it('reports a persistent stall only once per episode', async () => {
    const { controller, media, errors, onItemIds } = build()
    media.hangIds.add('B') // B's prepare never settles -> the loop stalls on it
    controller.load(snapshot([img('A'), img('B'), img('C')]))
    await flush()
    await vi.advanceTimersByTimeAsync(2000) // A -> attempt B (hangs)
    // Past the watchdog grace, across several watchdog intervals.
    await vi.advanceTimersByTimeAsync(40_000)
    const stalls = errors.filter(
      (e) => e.error instanceof Error && e.error.message.includes('stalled'),
    )
    // Eight watchdog ticks fit in that window, so a report per TICK — the noise
    // this guards against — would be eight errors. Each report here is one
    // episode: the forced advance now steps PAST the hung item and the rotation
    // keeps running, so it can only stall again once it comes back round to it,
    // which is a new episode rather than the same one repeated.
    expect(stalls.length).toBeGreaterThan(0)
    expect(stalls.length).toBeLessThan(4)
    // And the screen escaped instead of sitting on the hung item forever.
    expect(onItemIds).toContain('C')
    controller.destroy()
  })

  it('does not report a stall while the page is hidden', async () => {
    const globals = globalThis as { document?: unknown }
    const previous = globals.document
    globals.document = {
      visibilityState: 'hidden',
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }
    try {
      const { controller, media, errors } = build()
      media.hangIds.add('B')
      controller.load(snapshot([img('A'), img('B'), img('C')]))
      await flush()
      await vi.advanceTimersByTimeAsync(2000) // A -> attempt B (hangs)
      await vi.advanceTimersByTimeAsync(40_000) // well past the watchdog grace
      const stalls = errors.filter(
        (e) => e.error instanceof Error && e.error.message.includes('stalled'),
      )
      expect(stalls).toHaveLength(0)
      controller.destroy()
    } finally {
      globals.document = previous
    }
  })

  it('does not cut a video off on a wallclock cap (waits for ended/watchdog)', async () => {
    const { controller, onItemIds } = build()
    // Metadata says 2s, but a video must advance on its real `ended` (which the
    // fake slot never fires), not on a metadata-derived wallclock cap.
    controller.load(snapshot([video('V', 2000), img('B')]))
    await flush()
    expect(onItemIds).toEqual(['V'])
    // Well past the old `durationMs + 2s` cap, but below the watchdog grace
    // (duration + 15s): the video is still on screen, never truncated.
    await vi.advanceTimersByTimeAsync(10_000)
    expect(onItemIds).toEqual(['V'])
    // Past the watchdog grace the backstop finally force-advances.
    await vi.advanceTimersByTimeAsync(10_000)
    expect(onItemIds.at(-1)).toBe('B')
    controller.destroy()
  })

  it('applies volume changes to both slots immediately', async () => {
    const { controller, slots } = build()
    controller.load(snapshot([video('V')]))
    await flush()
    controller.setVolume(0.5)
    expect(slots[0]?.volume).toBe(0.5)
    expect(slots[1]?.volume).toBe(0.5)
    controller.destroy()
  })

  it('does nothing on an empty playlist', async () => {
    const { controller, onItemIds } = build()
    controller.load(snapshot([]))
    await flush()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(onItemIds).toEqual([])
    controller.destroy()
  })

  it('stops all timers after destroy', async () => {
    const { controller, onItemIds } = build()
    controller.load(snapshot([img('A'), img('B')]))
    await flush()
    controller.destroy()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(onItemIds).toEqual(['A'])
  })

  it('skips a leading network-only app when loaded offline', async () => {
    const { controller, onItemIds } = build()
    controller.setOnline(false)
    controller.load(snapshot([app('Y'), img('A'), img('B')]))
    await flush()
    // Y needs internet and we're offline: start at the first playable item.
    expect(onItemIds).toEqual(['A'])
    await vi.advanceTimersByTimeAsync(2000) // A -> B (Y still skipped)
    expect(onItemIds).toEqual(['A', 'B'])
    controller.destroy()
  })

  it('auto-advance skips network apps while offline', async () => {
    const { controller, onItemIds } = build()
    controller.setOnline(false)
    controller.load(snapshot([img('A'), app('Y'), img('B')]))
    await flush()
    await vi.advanceTimersByTimeAsync(2000) // A -> B (Y skipped, no dwell on it)
    expect(onItemIds).toEqual(['A', 'B'])
    controller.destroy()
  })

  it('jumps off the current item the instant it goes offline', async () => {
    const { controller, onItemIds } = build()
    controller.load(snapshot([img('A'), app('Y'), img('B')]))
    await flush()
    await vi.advanceTimersByTimeAsync(2000) // A -> Y (online, playable)
    expect(onItemIds).toEqual(['A', 'Y'])
    // Internet drops while the network app is on screen: jump to the next
    // playable item immediately — no reload, no waiting for the dwell timer.
    controller.setOnline(false)
    await flush()
    expect(onItemIds).toEqual(['A', 'Y', 'B'])
    controller.destroy()
  })

  it('brings network apps back into rotation the instant internet returns', async () => {
    const { controller, onItemIds } = build()
    controller.setOnline(false)
    controller.load(snapshot([img('A'), app('Y')]))
    await flush()
    expect(onItemIds).toEqual(['A']) // Y hidden while offline
    await vi.advanceTimersByTimeAsync(2000) // only A is playable -> loops on A
    expect(onItemIds).toEqual(['A', 'A'])
    // Reconnect: Y rejoins and shows on the next advance (no reload).
    controller.setOnline(true)
    await flush()
    await vi.advanceTimersByTimeAsync(2000) // A -> Y
    expect(onItemIds.at(-1)).toBe('Y')
    controller.destroy()
  })

  it('shows nothing when every item needs network and we are offline', async () => {
    const { controller, onItemIds } = build()
    controller.setOnline(false)
    controller.load(snapshot([app('Y1'), app('Y2')]))
    await flush()
    await vi.advanceTimersByTimeAsync(10_000)
    // Nothing is playable; the engine stays idle (the shell shows the splash).
    expect(onItemIds).toEqual([])
    controller.destroy()
  })

  it('does not auto-advance on connectivity changes in follow mode', async () => {
    const { controller, onItemIds } = build({ follow: true })
    controller.load(snapshot([img('A'), app('Y'), img('B')]))
    await flush()
    expect(onItemIds).toEqual(['A'])
    // Follow mode mirrors the device 1:1; a local online flip must not move us.
    controller.setOnline(false)
    controller.setOnline(true)
    await flush()
    await vi.advanceTimersByTimeAsync(5000)
    expect(onItemIds).toEqual(['A'])
    controller.destroy()
  })
})
