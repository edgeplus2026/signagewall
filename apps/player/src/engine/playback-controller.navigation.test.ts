import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerSnapshot, Renderable } from '../types'
import { PlaybackController, type PlaybackSlot } from './playback-controller'

/**
 * Regression cover for the three ways a single slow or broken video used to
 * freeze the whole player, all three observed on a real screen:
 *
 *  - a press arriving during a media load was recorded but not acted on until
 *    that load finished (up to 12s), so the UI simply stopped answering;
 *  - navigation stepped from the last item that RENDERED, so every press after a
 *    failure re-targeted the very item that had just failed;
 *  - a failure that was superseded by a press was dropped without a word, so the
 *    console stayed empty exactly when someone was trying to diagnose it.
 */

function img(id: string, durationMs = 8000): Renderable {
  return { id, kind: 'image', url: `https://cdn.test/${id}.webp`, durationMs }
}

function video(id: string, durationMs = 8000): Renderable {
  return { id, kind: 'video', url: `https://cdn.test/${id}.mp4`, durationMs }
}

function snapshot(items: Renderable[]): PlayerSnapshot {
  return { screenId: 's', name: 'screen', revision: 'r1', items }
}

interface Behaviour {
  /** Ids whose prepare rejects, after `delayMs`. */
  failIds: Set<string>
  /** Ids whose prepare takes `delayMs` and then succeeds. */
  slowIds: Set<string>
  delayMs: number
}

/** Records every prepare so a restarted download is visible to assertions. */
class FakeSlot implements PlaybackSlot {
  readonly el = { remove: () => undefined } as unknown as HTMLElement

  constructor(
    private readonly behaviour: Behaviour,
    private readonly prepared: string[],
  ) {}

  prepare(item: Renderable): Promise<void> {
    this.prepared.push(item.id)
    const { failIds, slowIds, delayMs } = this.behaviour
    if (failIds.has(item.id)) {
      return new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('video load error'))
        }, delayMs)
      })
    }
    if (slowIds.has(item.id)) {
      return new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    }
    return Promise.resolve()
  }

  activate(): void {}
  deactivate(): void {}
  release(): void {}
  setVolume(): void {}
  tryUnmute(): void {}
  mediaDurationMs(): number | null {
    return null
  }
}

function build(behaviour: Partial<Behaviour> = {}, follow = false) {
  const resolved: Behaviour = {
    failIds: behaviour.failIds ?? new Set(),
    slowIds: behaviour.slowIds ?? new Set(),
    delayMs: behaviour.delayMs ?? 0,
  }
  const prepared: string[] = []
  const shown: string[] = []
  const errors: string[] = []
  const root = {
    append: () => undefined,
    clientWidth: 1920,
    clientHeight: 1080,
  } as unknown as HTMLElement

  const controller = new PlaybackController(
    root,
    {
      onItem: (item) => shown.push(item.id),
      onError: (error) => errors.push((error as Error).message),
    },
    () => new FakeSlot(resolved, prepared),
    { requiresNetwork: () => false, follow },
  )

  return { controller, prepared, shown, errors }
}

describe('PlaybackController navigation under a slow or broken video', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('answers a press while a slow video is still loading', async () => {
    // B is a big clip on a cold cache: nothing is broken, it just takes 9s.
    const { controller, shown } = build({
      slowIds: new Set(['B']),
      delayMs: 9000,
    })
    controller.load(snapshot([img('A'), video('B'), img('C'), img('D')]))
    await vi.advanceTimersByTimeAsync(0)
    expect(shown).toEqual(['A'])

    controller.next() // -> B, the 9s load begins
    await vi.advanceTimersByTimeAsync(500)
    controller.next() // "get me past this clip"
    await vi.advanceTimersByTimeAsync(50)

    // The step lands immediately rather than after the clip finishes buffering.
    expect(shown).toEqual(['A', 'C'])
    controller.destroy()
  })

  it('reuses an in-flight load when the same item is requested again', async () => {
    // Follow mode gives the cleanest handle on this: a device that re-reports the
    // item it is already loading (a reconnect replays now-playing) must not make
    // us drop the download and start it again. `prepare()` opens with
    // `release()`, which discards every buffered byte, so a restart turns a slow
    // clip into one that can never finish.
    const { controller, prepared } = build(
      { slowIds: new Set(['B']), delayMs: 9000 },
      true,
    )
    controller.load(snapshot([img('A'), video('B'), img('C')]))
    await vi.advanceTimersByTimeAsync(0)
    prepared.length = 0

    controller.showItem('B') // load begins
    await vi.advanceTimersByTimeAsync(500)
    controller.showItem('B') // same item re-reported mid-load
    await vi.advanceTimersByTimeAsync(500)

    expect(prepared.filter((id) => id === 'B')).toEqual(['B'])
    controller.destroy()
  })

  it('steps over a broken item instead of re-targeting it', async () => {
    const { controller, prepared, shown } = build({ failIds: new Set(['B']) })
    controller.load(snapshot([img('A'), video('B'), img('C'), img('D')]))
    await vi.advanceTimersByTimeAsync(0)
    prepared.length = 0

    controller.next() // -> B, fails
    await vi.advanceTimersByTimeAsync(10)
    controller.next() // must move ON, not retry B

    await vi.advanceTimersByTimeAsync(10)
    expect(shown).toEqual(['A', 'C'])
    expect(prepared.filter((id) => id === 'B')).toHaveLength(1)
    controller.destroy()
  })

  it('keeps stepping past a broken item on repeated presses', async () => {
    const { controller, shown } = build({ failIds: new Set(['B']) })
    controller.load(snapshot([img('A'), video('B'), img('C'), img('D')]))
    await vi.advanceTimersByTimeAsync(0)

    for (let i = 0; i < 3; i++) {
      controller.next()
      await vi.advanceTimersByTimeAsync(100)
    }

    // A -> (B fails) -> C -> D, never stuck on A.
    expect(shown).toEqual(['A', 'C', 'D'])
    controller.destroy()
  })

  it('reports a failure even when a press superseded it', async () => {
    const { controller, errors } = build({
      failIds: new Set(['B']),
      delayMs: 3000,
    })
    controller.load(snapshot([img('A'), video('B'), img('C'), img('D')]))
    await vi.advanceTimersByTimeAsync(0)

    controller.next() // -> B, will fail in 3s
    await vi.advanceTimersByTimeAsync(500)
    controller.next() // supersedes the doomed load
    await vi.advanceTimersByTimeAsync(4000)

    expect(errors).toContain('video load error')
    controller.destroy()
  })

  it('still auto-skips a broken item when nobody is pressing anything', async () => {
    const { controller, shown, errors } = build({ failIds: new Set(['B']) })
    controller.load(snapshot([img('A'), video('B'), img('C')]))
    await vi.advanceTimersByTimeAsync(0)

    controller.next()
    await vi.advanceTimersByTimeAsync(400) // SKIP_DELAY_MS + slack

    expect(shown).toEqual(['A', 'C'])
    expect(errors).toEqual(['video load error'])
    controller.destroy()
  })
})
