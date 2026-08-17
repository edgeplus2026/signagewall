import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlaybackBatch } from '@signagewall/player-contract'

import type { PlaybackRecord } from '../engine/playback-controller'

/**
 * A stand-in for IndexedDB that keeps its contents across a simulated reload —
 * which is the whole point of the module under test. Cloned on the way in and
 * out so a test can never accidentally assert against a live in-memory object.
 */
const disk = vi.hoisted(() => ({ state: null as unknown }))

vi.mock('../persistence/idb', () => ({
  savePlayback: vi.fn((state: unknown) => {
    disk.state = structuredClone(state)
    return Promise.resolve()
  }),
  loadPlayback: vi.fn(() =>
    Promise.resolve(disk.state ? structuredClone(disk.state) : null),
  ),
}))

const { recordPlay, resetTalliesForTests, peekTallies, pendingCount } =
  await import('./playback-log')
const {
  flushPlayback,
  registerPlaybackSender,
  resetPlaybackReportingForTests,
  restorePlayback,
  startPlaybackReporting,
} = await import('./playback-report')

/** A play of `contentId` at a decidable local hour, long enough to count. */
function play(contentId: string, hour = 9, ms = 15_000): PlaybackRecord {
  const startedAt = new Date(2026, 7, 17, hour, 30, 0, 0).getTime()
  return { contentId, kind: 'image', startedAt, endedAt: startedAt + ms }
}

/** A promise the test resolves by hand, to hold a send open. */
function gate(): { promise: Promise<boolean>; open: () => void } {
  let open!: () => void
  const promise = new Promise<boolean>((resolve) => {
    open = () => {
      resolve(true)
    }
  })
  return { promise, open }
}

/** A window whose listeners the test can fire, as the browser would. */
function stubWindow(): Record<string, () => void> {
  const listeners: Record<string, () => void> = {}
  vi.stubGlobal('window', {
    addEventListener: (event: string, fn: () => void) => {
      listeners[event] = fn
    },
    removeEventListener: (event: string) => {
      delete listeners[event]
    },
  })
  return listeners
}

/** Sender that records what it saw and answers as told. */
function sender(answer: boolean | (() => Promise<boolean>)) {
  const sent: PlaybackBatch[] = []
  const fn = vi.fn((batch: PlaybackBatch) => {
    sent.push(structuredClone(batch))
    return typeof answer === 'function' ? answer() : Promise.resolve(answer)
  })
  registerPlaybackSender(fn)
  return { sent, fn }
}

/** What the module would find on disk after a power cut, as the boot sees it. */
function simulateReload(): Promise<void> {
  resetTalliesForTests()
  resetPlaybackReportingForTests()
  return restorePlayback()
}

beforeEach(() => {
  disk.state = null
  resetTalliesForTests()
  resetPlaybackReportingForTests()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('proof-of-play delivery', () => {
  it('holds everything until the socket registers a sender', async () => {
    recordPlay(play('media-1'))
    expect(await flushPlayback()).toBe(false)
    // Nothing was dropped on the floor for want of a socket.
    expect(pendingCount()).toBe(1)
  })

  it('sends nothing when there is nothing to send', async () => {
    const { fn } = sender(true)
    expect(await flushPlayback()).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })

  it('sends one batch carrying the totals, not a row per play', async () => {
    const { sent } = sender(true)
    recordPlay(play('media-1'))
    recordPlay(play('media-1'))
    recordPlay(play('media-2', 10))

    expect(await flushPlayback()).toBe(true)

    expect(sent).toHaveLength(1)
    expect(sent[0]?.seq).toBe(1)
    expect(sent[0]?.tallies).toHaveLength(2)
    expect(sent[0]?.tallies.find((t) => t.contentId === 'media-1')).toMatchObject(
      { plays: 2, airtimeMs: 30_000, day: '2026-08-17' },
    )
  })

  it('is on disk before it is on the wire', async () => {
    let diskWhenSent: unknown = null
    sender(() => {
      // Read at the moment of sending: a device that dies here must come back
      // knowing exactly what it had in flight.
      diskWhenSent = structuredClone(disk.state)
      return Promise.resolve(true)
    })
    recordPlay(play('media-1'))

    await flushPlayback()

    const saved = diskWhenSent as { seq: number; pending: PlaybackBatch | null }
    expect(saved.seq).toBe(1)
    expect(saved.pending?.seq).toBe(1)
    expect(saved.pending?.tallies).toHaveLength(1)
  })

  it('forgets a batch only once it is acknowledged', async () => {
    sender(true)
    recordPlay(play('media-1'))

    await flushPlayback()

    expect(pendingCount()).toBe(0)
    const saved = disk.state as { tallies: unknown[]; pending: unknown }
    expect(saved.tallies).toHaveLength(0)
    expect(saved.pending).toBeNull()
  })

  it('keeps the plays that landed during the round trip', async () => {
    const held = gate()
    sender(() => held.promise)
    recordPlay(play('media-1'))
    recordPlay(play('media-1'))

    const flushing = flushPlayback()
    // The screen does not stop playing because a report is in the post.
    recordPlay(play('media-1'))
    recordPlay(play('media-2', 11))
    held.open()
    expect(await flushing).toBe(true)

    const left = peekTallies()
    expect(left.find((t) => t.contentId === 'media-1')?.plays).toBe(1)
    expect(left.find((t) => t.contentId === 'media-2')?.plays).toBe(1)
  })

  it('re-sends the same batch under the same number when the ack never comes', async () => {
    const { sent } = sender(false)
    recordPlay(play('media-1'))

    expect(await flushPlayback()).toBe(false)
    // More playback happens before the retry — it must not join a batch the
    // server may already have written, or it would be dropped as a duplicate.
    recordPlay(play('media-2', 12))
    expect(await flushPlayback()).toBe(false)

    expect(sent).toHaveLength(2)
    expect(sent[1]?.seq).toBe(1)
    expect(sent[1]?.tallies).toEqual(sent[0]?.tallies)
    // Nothing was forgotten in the meantime.
    expect(pendingCount()).toBe(2)
  })

  it('moves on to the next number once the repeat is finally acknowledged', async () => {
    let answer = false
    const { sent } = sender(() => Promise.resolve(answer))
    recordPlay(play('media-1'))

    await flushPlayback()
    recordPlay(play('media-2', 12))
    answer = true
    await flushPlayback()
    // The retry cleared only what it carried; media-2 goes out next, freshly
    // numbered so the server treats it as new rather than a repeat.
    await flushPlayback()

    expect(sent.map((batch) => batch.seq)).toEqual([1, 1, 2])
    expect(sent[2]?.tallies).toHaveLength(1)
    expect(sent[2]?.tallies[0]?.contentId).toBe('media-2')
    expect(pendingCount()).toBe(0)
  })

  it('refreshes the timestamp on a retry so the clock check stays current', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 17, 9, 0, 0))
    const { sent } = sender(false)
    recordPlay(play('media-1'))

    await flushPlayback()
    vi.setSystemTime(new Date(2026, 7, 17, 9, 30, 0))
    await flushPlayback()

    expect(sent[1]?.at).toBeGreaterThan(sent[0]?.at ?? 0)
    expect(sent[1]?.seq).toBe(sent[0]?.seq)
  })

  it('survives a reload with the batch and the number intact', async () => {
    sender(false)
    recordPlay(play('media-1'))
    recordPlay(play('media-2', 10))
    await flushPlayback()

    // Power cut, nightly reload, page recovery — all look the same from here.
    await simulateReload()

    expect(pendingCount()).toBe(2)
    const { sent } = sender(true)
    expect(await flushPlayback()).toBe(true)
    // Same number as the attempt that was lost, so the server can recognise it.
    expect(sent[0]?.seq).toBe(1)
    expect(sent[0]?.tallies).toHaveLength(2)
    expect(pendingCount()).toBe(0)
  })

  it('keeps counting up from the last used number after a reload', async () => {
    sender(true)
    recordPlay(play('media-1'))
    await flushPlayback()

    await simulateReload()

    const { sent } = sender(true)
    recordPlay(play('media-2', 10))
    await flushPlayback()
    // Not 1 again: a re-used number would be discarded as a duplicate and the
    // day's playback would silently go missing.
    expect(sent[0]?.seq).toBe(2)
  })

  it('stamps every batch from one counter with the same identity', async () => {
    const { sent } = sender(true)
    recordPlay(play('media-1'))
    await flushPlayback()
    recordPlay(play('media-2', 10))
    await flushPlayback()

    await simulateReload()
    const second = sender(true)
    recordPlay(play('media-3', 11))
    await flushPlayback()

    expect(sent[0]?.origin).toBeTruthy()
    expect(sent[1]?.origin).toBe(sent[0]?.origin)
    // A reload is not a new counter — the numbering continued, so the identity
    // must too, or the server would treat the whole history as a fresh device.
    expect(second.sent[0]?.origin).toBe(sent[0]?.origin)
  })

  it('mints a new identity when the store is wiped and numbering restarts', async () => {
    const { sent } = sender(true)
    recordPlay(play('media-1'))
    await flushPlayback()

    // Storage eviction on a tight device, or an operator clearing site data.
    // The native shell keeps the device id, so the server sees the same screen.
    disk.state = null
    await simulateReload()

    const second = sender(true)
    recordPlay(play('media-2', 10))
    await flushPlayback()

    // The number went backwards, which on its own is indistinguishable from a
    // stale repeat. The identity is what says otherwise.
    expect(second.sent[0]?.seq).toBe(1)
    expect(sent[0]?.seq).toBe(1)
    expect(second.sent[0]?.origin).not.toBe(sent[0]?.origin)
  })

  it('keeps a play that landed while the disk read was still in flight', async () => {
    // Boot reads the snapshot and the tallies at the same time, so the stage can
    // be on screen — and finish an appearance — before the restore comes back.
    disk.state = {
      tallies: [
        {
          contentId: 'media-1',
          day: '2026-08-17',
          kind: 'image',
          plays: 4,
          airtimeMs: 60_000,
          hours: [],
          airtimeHours: [],
          firstAt: 1,
          lastAt: 2,
        },
      ],
      seq: 3,
      origin: 'counter-a',
    }
    resetTalliesForTests()
    resetPlaybackReportingForTests()
    recordPlay(play('media-1'))

    await restorePlayback()

    // Five, not four: the restore added to what was already there instead of
    // replacing it.
    expect(peekTallies()[0]?.plays).toBe(5)
    expect(peekTallies()[0]?.airtimeMs).toBe(75_000)
  })

  it('ignores a malformed batch left by an older build without losing the plays', async () => {
    disk.state = {
      tallies: [
        {
          contentId: 'media-1',
          day: '2026-08-17',
          kind: 'image',
          plays: 4,
          airtimeMs: 60_000,
          hours: [],
          firstAt: 1,
          lastAt: 2,
        },
      ],
      seq: 7,
      origin: 'counter-a',
      pending: { seq: 'not-a-number' },
    }

    await simulateReload()

    const { sent } = sender(true)
    await flushPlayback()
    // The unusable batch was dropped, but its plays were never in it — they are
    // in the tallies, which are only cleared on an acknowledgement.
    expect(sent[0]?.seq).toBe(8)
    expect(sent[0]?.tallies[0]).toMatchObject({ contentId: 'media-1', plays: 4 })
  })

  it('will not put two batches on the wire at once', async () => {
    const held = gate()
    const { fn } = sender(() => held.promise)
    recordPlay(play('media-1'))

    const first = flushPlayback()
    // The five-minute timer and a reconnect can land together.
    expect(await flushPlayback()).toBe(false)
    held.open()
    await first

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not lose the batch when the socket throws instead of answering', async () => {
    registerPlaybackSender(() => {
      throw new Error('socket closed')
    })
    recordPlay(play('media-1'))

    expect(await flushPlayback()).toBe(false)
    expect(pendingCount()).toBe(1)
  })
})

describe('the reporting loop', () => {
  it('sends on the interval, and stops when disposed', async () => {
    stubWindow()
    vi.useFakeTimers()
    const { fn } = sender(true)
    recordPlay(play('media-1'))

    const stop = startPlaybackReporting()
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(fn).toHaveBeenCalledTimes(1)

    stop()
    recordPlay(play('media-2', 10))
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('empties a screen that has been away as soon as it is back', async () => {
    const listeners = stubWindow()
    const { fn } = sender(true)
    recordPlay(play('media-1'))

    const stop = startPlaybackReporting()
    // Waiting out the interval would mean up to five more minutes of a screen
    // holding evidence it could have delivered the moment the link returned.
    listeners.online?.()
    await vi.waitFor(() => {
      expect(fn).toHaveBeenCalledTimes(1)
    })
    stop()
  })

  it('writes the tally down when the page is going away', async () => {
    const listeners = stubWindow()
    recordPlay(play('media-1'))

    const stop = startPlaybackReporting()
    listeners.pagehide?.()
    await vi.waitFor(() => {
      expect((disk.state as { tallies: unknown[] } | null)?.tallies).toHaveLength(1)
    })
    stop()
  })
})
