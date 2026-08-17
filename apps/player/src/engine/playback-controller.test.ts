import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerSnapshot, Renderable } from '../types'
import {
  PlaybackController,
  type ControllerOptions,
  type PlaybackRecord,
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

  activate(onEnded: () => void): void {
    this.active = true
    // Kept so a test can end a clip the way the element would.
    this.onEnded = onEnded
  }

  onEnded: (() => void) | null = null

  deactivate(): void {
    this.active = false
  }

  release(): void {
    this.active = false
  }

  setVolume(volume: number): void {
    this.volume = volume
  }

  tryUnmute(): void {
    // Audio recovery is exercised at the Slot level, not the loop logic.
  }

  /** Refreshed payloads handed to this slot in place (no reload). */
  readonly updates: Renderable[] = []
  /** How many times this slot replayed its video without reloading it. */
  replays = 0
  /** Whether this slot is the on-screen one (the real Slot reads a CSS class). */
  active = false

  replay(): boolean {
    if (this.current?.kind !== 'video' || !this.active) {
      return false
    }
    this.replays += 1
    return true
  }

  applyUpdate(item: Renderable): boolean {
    if (item.kind !== 'app' || this.current?.id !== item.id) {
      return false
    }
    this.current = item
    this.updates.push(item)
    return true
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
  const plays: PlaybackRecord[] = []
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
      onPlay: (record) => plays.push(record),
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

  return { controller, media, slots, onItemIds, plays, errors }
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

  // A snapshot revision moves for reasons unrelated to the rotation: the backend
  // folds every app's `fetchedAt` into it, so a crypto ticker refreshing its
  // prices re-pushes an identical playlist under a new revision. Restarting on
  // that meant a 20-item playlist with a 5-minute app in it never reached its
  // back half.
  describe('data-only snapshot pushes', () => {
    /** The same playlist, with a fresh payload on the app item. */
    function withData(data: unknown, revision: string): PlayerSnapshot {
      return snapshot(
        [
          img('A'),
          img('B'),
          { id: 'W', kind: 'app', slug: 'weather', config: {}, durationMs: 2000, data },
        ],
        revision,
      )
    }

    it('keeps its place when only an app payload changed', async () => {
      const { controller, onItemIds } = build({
        requiresNetwork: () => false,
      })
      controller.load(withData({ t: 1 }, 'r1'))
      await flush()
      await vi.advanceTimersByTimeAsync(2000) // A -> B
      expect(onItemIds).toEqual(['A', 'B'])

      controller.load(withData({ t: 2 }, 'r2'))
      await flush()
      // No jump back to the head…
      expect(onItemIds).toEqual(['A', 'B'])
      // …and the loop carries on from where it was.
      await vi.advanceTimersByTimeAsync(2000)
      expect(onItemIds).toEqual(['A', 'B', 'W'])
      controller.destroy()
    })

    it('hands the refreshed payload to the item currently on screen', async () => {
      const { controller, slots, onItemIds } = build({
        requiresNetwork: () => false,
      })
      // A single-app playlist — a menu board or a weather screen — never changes
      // item, so an in-place update is the ONLY way it ever sees fresh data.
      const only = (data: unknown, revision: string): PlayerSnapshot =>
        snapshot(
          [{ id: 'W', kind: 'app', slug: 'weather', config: {}, durationMs: 2000, data }],
          revision,
        )

      controller.load(only({ t: 1 }, 'r1'))
      await flush()
      expect(onItemIds).toEqual(['W'])

      controller.load(only({ t: 2 }, 'r2'))
      await flush()
      const updated = slots.flatMap((slot) => slot.updates)
      expect(updated).toHaveLength(1)
      expect(updated[0]).toMatchObject({ id: 'W', data: { t: 2 } })
      controller.destroy()
    })

    it('leaves an app alone when it was somebody else\'s payload that moved', async () => {
      const { controller, slots, onItemIds } = build({
        requiresNetwork: () => false,
      })
      // Two apps on one screen. One snapshot carries both, so a weather refresh
      // also re-delivers the calendar's config — and a bundle that re-renders on
      // config would restart its scroll for a change that was not its own.
      const pair = (weather: unknown, revision: string): PlayerSnapshot =>
        snapshot(
          [
            { id: 'C', kind: 'app', slug: 'gcal', config: {}, durationMs: 2000, data: { e: 1 } },
            { id: 'W', kind: 'app', slug: 'weather', config: {}, durationMs: 2000, data: weather },
          ],
          revision,
        )

      controller.load(pair({ t: 1 }, 'r1'))
      await flush()
      expect(onItemIds).toEqual(['C'])

      controller.load(pair({ t: 2 }, 'r2'))
      await flush()
      // The calendar is on screen and its own data is unchanged: untouched.
      expect(slots.flatMap((slot) => slot.updates)).toEqual([])
      controller.destroy()
    })

    it('still re-bases when the rotation itself changed', async () => {
      const { controller, onItemIds } = build({ requiresNetwork: () => false })
      controller.load(snapshot([img('A'), img('B'), img('C')], 'r1'))
      await flush()
      await vi.advanceTimersByTimeAsync(2000) // A -> B
      expect(onItemIds).toEqual(['A', 'B'])

      // An item was removed: a genuinely different playlist.
      controller.load(snapshot([img('A'), img('C')], 'r2'))
      await flush()
      expect(onItemIds).toEqual(['A', 'B', 'A'])
      controller.destroy()
    })

    it('carries on where it is when an item is ADDED to the rotation', async () => {
      const { controller, onItemIds } = build({ requiresNetwork: () => false })
      controller.load(snapshot([img('A'), img('B')], 'r1'))
      await flush()
      await vi.advanceTimersByTimeAsync(2000)
      expect(onItemIds).toEqual(['A', 'B'])

      // The operator drops a third poster into the playlist while B is up.
      // Nothing about B changed, so B stays on the wall.
      controller.load(snapshot([img('A'), img('B'), img('C')], 'r2'))
      await flush()
      expect(onItemIds).toEqual(['A', 'B'])

      // ...and the loop continues INTO the new list rather than from the head.
      await vi.advanceTimersByTimeAsync(2000)
      expect(onItemIds).toEqual(['A', 'B', 'C'])
      controller.destroy()
    })

    it('carries on when an item further down the list is removed', async () => {
      const { controller, onItemIds } = build({ requiresNetwork: () => false })
      controller.load(snapshot([img('A'), img('B'), img('C')], 'r1'))
      await flush()
      await vi.advanceTimersByTimeAsync(2000)
      expect(onItemIds).toEqual(['A', 'B'])

      controller.load(snapshot([img('A'), img('B')], 'r2'))
      await flush()
      expect(onItemIds).toEqual(['A', 'B'])
      controller.destroy()
    })

    it('keeps its place even when the edit moved it up the list', async () => {
      const { controller, onItemIds } = build({ requiresNetwork: () => false })
      controller.load(snapshot([img('A'), img('B'), img('C')], 'r1'))
      await flush()
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(2000)
      expect(onItemIds).toEqual(['A', 'B', 'C'])

      // A is deleted, so C is now index 1. The screen must not jump.
      controller.load(snapshot([img('B'), img('C')], 'r2'))
      await flush()
      expect(onItemIds).toEqual(['A', 'B', 'C'])

      // The next advance wraps from C's NEW position, not its old one.
      await vi.advanceTimersByTimeAsync(2000)
      expect(onItemIds).toEqual(['A', 'B', 'C', 'B'])
      controller.destroy()
    })

    it('goes back to the head when the item on screen is deleted', async () => {
      const { controller, onItemIds } = build({ requiresNetwork: () => false })
      controller.load(snapshot([img('A'), img('B')], 'r1'))
      await flush()
      await vi.advanceTimersByTimeAsync(2000)
      expect(onItemIds).toEqual(['A', 'B'])

      // B is gone; there is nothing to carry on from.
      controller.load(snapshot([img('A'), img('C')], 'r2'))
      await flush()
      expect(onItemIds).toEqual(['A', 'B', 'A'])
      controller.destroy()
    })

    it('re-bases when an item url changed under the same id', async () => {
      const { controller, onItemIds } = build({ requiresNetwork: () => false })
      controller.load(snapshot([img('A'), img('B')], 'r1'))
      await flush()
      await vi.advanceTimersByTimeAsync(2000)
      expect(onItemIds).toEqual(['A', 'B'])

      // Same ids and order, but B now points at different bytes — the media was
      // replaced in the CMS. That has to reload, not carry on.
      controller.load(
        snapshot(
          [img('A'), { id: 'B', kind: 'image', url: 'https://cdn.test/B2.webp', durationMs: 2000 }],
          'r2',
        ),
      )
      await flush()
      expect(onItemIds).toEqual(['A', 'B', 'A'])
      controller.destroy()
    })
  })

  // A one-item playlist loops onto itself. Doing that through a full transition
  // tears the decode session down and builds it again on every pass — roughly
  // 2 900 times a day for a 30-second clip, which is what costs a two-instance
  // hardware decoder its second slot.
  describe('single-video playlists', () => {
    it('replays in place when the clip ends naturally', async () => {
      const { controller, slots, onItemIds } = build()
      controller.load(snapshot([video('V')]))
      await flush()
      expect(onItemIds).toEqual(['V'])

      const active = slots.find((slot) => slot.active)
      expect(active).toBeDefined()
      active?.onEnded?.()
      await flush()

      expect(active?.replays).toBe(1)
      // No second transition: the item never left the screen.
      expect(onItemIds).toEqual(['V'])
      controller.destroy()
    })

    it('does a real transition when the watchdog forces the move', async () => {
      const { controller, slots, onItemIds } = build()
      controller.load(snapshot([video('V', 1000)]))
      await flush()

      // A forced advance means the current state is suspect — reloading is the
      // whole point, so replaying in place would defeat it.
      await vi.advanceTimersByTimeAsync(40_000)
      expect(slots.every((slot) => slot.replays === 0)).toBe(true)
      expect(onItemIds.length).toBeGreaterThan(1)
      controller.destroy()
    })

    it('still transitions normally with more than one item', async () => {
      const { controller, slots, onItemIds } = build()
      controller.load(snapshot([video('V'), img('B')]))
      await flush()

      slots.find((slot) => slot.active)?.onEnded?.()
      await flush()

      expect(slots.every((slot) => slot.replays === 0)).toBe(true)
      expect(onItemIds).toEqual(['V', 'B'])
      controller.destroy()
    })
  })

  // Proof-of-play is measured here, at the only place that knows when an item
  // actually reached the screen and when it left. Every exit is covered: the next
  // transition, a natural loop, and the teardown that standby, an emergency
  // takeover and leaving the page all share.
  describe('playback records', () => {
    function withContent(id: string, contentId: string, durationMs = 2000): Renderable {
      return { id, contentId, kind: 'image', url: `https://cdn.test/${id}.webp`, durationMs }
    }

    it('closes a play when the next item takes the screen', async () => {
      const { controller, plays } = build()
      controller.load(snapshot([withContent('A', 'media-1'), withContent('B', 'media-2')]))
      await flush()

      // Nothing is reported while it is still up — the length is not known yet.
      expect(plays).toEqual([])

      await vi.advanceTimersByTimeAsync(2000)
      expect(plays).toHaveLength(1)
      expect(plays[0]).toMatchObject({ contentId: 'media-1', kind: 'image' })
      expect(plays[0]!.endedAt - plays[0]!.startedAt).toBe(2000)
      controller.destroy()
    })

    it('reports the content id, not the slot id', async () => {
      const { controller, plays } = build()
      controller.load(snapshot([withContent('slot-1', 'media-1'), withContent('slot-2', 'media-2')]))
      await flush()
      await vi.advanceTimersByTimeAsync(2000)

      // The slot id changes whenever an operator reorders a playlist; the report
      // has to survive that.
      expect(plays[0]?.contentId).toBe('media-1')
      controller.destroy()
    })

    it('falls back to the slot id on a snapshot without contentId', async () => {
      const { controller, plays } = build()
      controller.load(snapshot([img('A'), img('B')]))
      await flush()
      await vi.advanceTimersByTimeAsync(2000)

      // An older backend: less stable, but the play is not lost.
      expect(plays[0]?.contentId).toBe('A')
      controller.destroy()
    })

    it('counts a looping clip once per pass', async () => {
      const { controller, slots, plays } = build()
      controller.load(snapshot([video('V')]))
      await flush()

      const active = slots.find((slot) => slot.active)
      await vi.advanceTimersByTimeAsync(5000)
      active?.onEnded?.()
      await flush()
      await vi.advanceTimersByTimeAsync(5000)
      active?.onEnded?.()
      await flush()

      // Two passes, two plays — not one play a day long.
      expect(plays).toHaveLength(2)
      expect(plays.every((p) => p.contentId === 'V')).toBe(true)
      expect(plays[0]!.endedAt - plays[0]!.startedAt).toBe(5000)
      controller.destroy()
    })

    it('closes the open play on teardown — standby, emergency, leaving the page', async () => {
      const { controller, plays } = build()
      controller.load(snapshot([withContent('A', 'media-1')]))
      await flush()
      await vi.advanceTimersByTimeAsync(1500)

      expect(plays).toEqual([])
      // All three of those unmount the stage, which destroys the controller.
      controller.destroy()

      expect(plays).toHaveLength(1)
      expect(plays[0]!.endedAt - plays[0]!.startedAt).toBe(1500)
    })

    it('never reports an item that failed to load', async () => {
      const { controller, media, plays, onItemIds } = build()
      media.failIds.add('B')
      controller.load(snapshot([img('A'), img('B'), img('C')]))
      await flush()
      await vi.advanceTimersByTimeAsync(2000) // A -> B, which fails
      await vi.advanceTimersByTimeAsync(2000) // skip on to C
      await flush()

      expect(onItemIds).not.toContain('B')
      // B never reached the screen, so it was never played.
      expect(plays.map((p) => p.contentId)).not.toContain('B')
      controller.destroy()
    })

    it('carries the slug for an app so the report can name it', async () => {
      const { controller, plays } = build({ requiresNetwork: () => false })
      controller.load(
        snapshot([
          { id: 's1', contentId: 'inst-1', kind: 'app', slug: 'weather', config: {}, durationMs: 2000 },
          img('B'),
        ]),
      )
      await flush()
      await vi.advanceTimersByTimeAsync(2000)

      expect(plays[0]).toMatchObject({ contentId: 'inst-1', kind: 'app', slug: 'weather' })
      controller.destroy()
    })
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
