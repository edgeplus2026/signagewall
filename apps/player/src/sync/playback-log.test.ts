import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlaybackRecord } from '../engine/playback-controller'
import {
  clearTallies,
  peekTallies,
  pendingCount,
  recordPlay,
  resetTalliesForTests,
} from './playback-log'

/** A play of `contentId` starting at `startedAt` and lasting `ms`. */
function play(
  contentId: string,
  startedAt: number,
  ms: number,
  extra: Partial<PlaybackRecord> = {},
): PlaybackRecord {
  return {
    contentId,
    kind: 'image',
    startedAt,
    endedAt: startedAt + ms,
    ...extra,
  }
}

/** Local-clock instant for a given hour of day, so the hour bucket is decidable. */
function atHour(hour: number): number {
  const d = new Date(2026, 7, 17, hour, 30, 0, 0)
  return d.getTime()
}

beforeEach(() => {
  resetTalliesForTests()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('playback tallies', () => {
  it('sums repeats of the same item instead of keeping a row each', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-1', atHour(9), 10_000))

    const [tally] = peekTallies()
    expect(peekTallies()).toHaveLength(1)
    expect(tally).toMatchObject({
      contentId: 'media-1',
      plays: 3,
      airtimeMs: 40_000,
    })
  })

  it('keeps items apart', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-2', atHour(9), 30_000))

    expect(pendingCount()).toBe(2)
    expect(
      peekTallies().map((t) => [t.contentId, t.plays, t.airtimeMs]),
    ).toEqual([
      ['media-1', 1, 15_000],
      ['media-2', 1, 30_000],
    ])
  })

  it('measures airtime per hour, which is what coverage is read from', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-1', atHour(13), 20_000))

    const [tally] = peekTallies()
    expect(tally?.airtimeHours[9]).toBe(30_000)
    expect(tally?.airtimeHours[13]).toBe(20_000)
    expect(tally?.airtimeHours).toHaveLength(24)
    // Counting plays cannot tell one item filling an hour from one item shown
    // once — and that difference is a stuck screen versus a working one.
    expect(tally?.hours[13]).toBe(1)
  })

  it('files each play under its local hour, for dayparting', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-1', atHour(13), 15_000))

    const [tally] = peekTallies()
    expect(tally?.hours[9]).toBe(2)
    expect(tally?.hours[13]).toBe(1)
    expect(tally?.hours).toHaveLength(24)
    // Every other hour stays zero — the array is a histogram, not a sparse map.
    expect(tally?.hours.reduce((a, b) => a + b, 0)).toBe(3)
  })

  it('records a flick with the time it actually lasted', () => {
    // An operator stepping through with the remote produces these. The design is
    // explicit that the recorder does not get to decide they did not happen —
    // the report can filter them, and then the filtering is visible.
    recordPlay(play('media-1', atHour(9), 50))
    expect(peekTallies()[0]).toMatchObject({ plays: 1, airtimeMs: 50 })
  })

  it('refuses a span that ran backwards', () => {
    // Not a short play — a clock that stepped while the item was on screen.
    recordPlay({
      contentId: 'media-1',
      kind: 'image',
      startedAt: atHour(9),
      endedAt: atHour(9) - 5_000,
    })
    expect(pendingCount()).toBe(0)
  })

  it('carries an app slug so the report can name it', () => {
    recordPlay(play('inst-1', atHour(9), 20_000, { kind: 'app', slug: 'weather' }))
    expect(peekTallies()[0]).toMatchObject({ kind: 'app', slug: 'weather' })
  })

  it('peeking does not clear — a batch is only safe to forget once confirmed', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    peekTallies()
    peekTallies()
    expect(pendingCount()).toBe(1)
    expect(peekTallies()[0]?.plays).toBe(1)
  })

  it('a returned batch is a copy, so later plays cannot mutate it', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    const batch = peekTallies()
    recordPlay(play('media-1', atHour(9), 15_000))

    // The caller is holding a batch it is about to send; it must not change
    // underneath them.
    expect(batch[0]?.plays).toBe(1)
    expect(batch[0]?.hours[9]).toBe(1)
    expect(batch[0]?.airtimeHours[9]).toBe(15_000)
  })

  it('clearing a confirmed batch keeps what arrived while it was in flight', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-1', atHour(9), 15_000))
    const batch = peekTallies()

    // The round trip takes time, and the screen keeps playing during it.
    recordPlay(play('media-1', atHour(9), 15_000))
    recordPlay(play('media-2', atHour(10), 5_000))

    clearTallies(batch)

    const left = peekTallies()
    expect(left).toHaveLength(2)
    expect(left.find((t) => t.contentId === 'media-1')).toMatchObject({
      plays: 1,
      airtimeMs: 15_000,
    })
    expect(left.find((t) => t.contentId === 'media-1')?.hours[9]).toBe(1)
    expect(left.find((t) => t.contentId === 'media-1')?.airtimeHours[9]).toBe(
      15_000,
    )
    // Untouched by the clear — it was never in the batch.
    expect(left.find((t) => t.contentId === 'media-2')).toMatchObject({ plays: 1 })
  })

  it('drops an item entirely once everything tallied for it is confirmed', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    clearTallies(peekTallies())
    expect(pendingCount()).toBe(0)
  })

  it('clearing a batch for an item that is already gone is harmless', () => {
    recordPlay(play('media-1', atHour(9), 15_000))
    const batch = peekTallies()
    clearTallies(batch)
    // A duplicate confirmation — a retry whose first ack was merely slow.
    clearTallies(batch)
    expect(pendingCount()).toBe(0)
  })

  it('refuses to grow without bound if ids ever start multiplying', () => {
    // Not a memory budget — a corruption guard. An unbounded map would take the
    // screen down with it.
    for (let i = 0; i < 1200; i += 1) {
      recordPlay(play(`media-${String(i)}`, atHour(9), 15_000))
    }
    expect(pendingCount()).toBe(1000)
  })
})
