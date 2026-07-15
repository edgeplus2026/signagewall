import { afterEach, describe, expect, it, vi } from 'vitest'

import { FakeClock } from '../../test/fake-clock'
import { restartPlayer } from '../restart'
import { applyUpdateOrReload } from '../native/updater'
import { DailyReloadScheduler, nextReloadAt, startDailyReload } from './daily-reload'

// The module imports the store (and transitively config/device) only for the
// `startDailyReload` wiring helper. Stub those so importing the unit under test
// has no browser/runtime side effects.
vi.mock('../store', () => ({ dailyReload: { value: { enabled: true, time: '03:00' } } }))
vi.mock('../restart', () => ({ restartPlayer: vi.fn() }))
vi.mock('../native/updater', () => ({ applyUpdateOrReload: vi.fn() }))

const HOUR = 60 * 60 * 1000

describe('nextReloadAt', () => {
  it('targets today when the time is still ahead', () => {
    const from = new Date(2026, 5, 26, 1, 0, 0).getTime() // 01:00 local
    const at = nextReloadAt('03:00', from)
    expect(new Date(at).getHours()).toBe(3)
    expect(new Date(at).getDate()).toBe(26)
  })

  it('rolls to tomorrow when the time has already passed', () => {
    const from = new Date(2026, 5, 26, 4, 0, 0).getTime() // 04:00 local
    const at = nextReloadAt('03:00', from)
    expect(new Date(at).getHours()).toBe(3)
    expect(new Date(at).getDate()).toBe(27)
  })

  it('rolls to tomorrow when exactly at the target minute', () => {
    const from = new Date(2026, 5, 26, 3, 0, 0).getTime()
    const at = nextReloadAt('03:00', from)
    expect(new Date(at).getDate()).toBe(27)
  })
})

describe('DailyReloadScheduler', () => {
  function setup(start: Date) {
    const clock = new FakeClock()
    clock.advance(start.getTime()) // seed wall clock
    const onReload = vi.fn()
    const scheduler = new DailyReloadScheduler({
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      onReload,
    })
    return { clock, scheduler, onReload }
  }

  it('fires once when the target time is reached', () => {
    const { clock, scheduler, onReload } = setup(new Date(2026, 5, 26, 1, 0, 0))
    scheduler.apply({ enabled: true, time: '03:00' })

    clock.advance(2 * HOUR) // advance to 03:00
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('does not fire before the target', () => {
    const { clock, scheduler, onReload } = setup(new Date(2026, 5, 26, 1, 0, 0))
    scheduler.apply({ enabled: true, time: '03:00' })

    clock.advance(HOUR) // 02:00 — still before
    expect(onReload).not.toHaveBeenCalled()
  })

  it('uses coarse chunks far out, not one-per-second polling', () => {
    const { clock, scheduler } = setup(new Date(2026, 5, 26, 1, 0, 0))
    scheduler.apply({ enabled: true, time: '03:00' })
    // Far from target: a single capped chunk is armed (not a fine poll).
    expect(clock.pending).toBe(1)
  })

  it('does nothing when disabled', () => {
    const { clock, scheduler, onReload } = setup(new Date(2026, 5, 26, 1, 0, 0))
    scheduler.apply({ enabled: false, time: '03:00' })
    expect(clock.pending).toBe(0)

    clock.advance(24 * HOUR)
    expect(onReload).not.toHaveBeenCalled()
  })

  it('rebases when the time changes', () => {
    const { clock, scheduler, onReload } = setup(new Date(2026, 5, 26, 1, 0, 0))
    scheduler.apply({ enabled: true, time: '03:00' })
    // Operator moves it earlier, to 02:00.
    scheduler.apply({ enabled: true, time: '02:00' })

    clock.advance(HOUR) // 02:00
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('fires immediately on overshoot (device was asleep past the target)', () => {
    const { clock, scheduler, onReload } = setup(new Date(2026, 5, 26, 1, 0, 0))
    scheduler.apply({ enabled: true, time: '03:00' })
    // Jump well past 03:00 in one leap (simulates a suspended device waking up).
    clock.advance(3 * HOUR)
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('re-arms for the next day when the reload does not tear down the page', () => {
    // Simulates a native host where onReload() triggers an async relaunch and
    // the JS context keeps running — the scheduler must keep firing daily.
    const { clock, scheduler, onReload } = setup(new Date(2026, 5, 26, 1, 0, 0))
    scheduler.apply({ enabled: true, time: '03:00' })

    clock.advance(2 * HOUR) // first fire at 03:00 today
    expect(onReload).toHaveBeenCalledTimes(1)

    clock.advance(24 * HOUR) // next day's 03:00
    expect(onReload).toHaveBeenCalledTimes(2)
  })

  it('does not infinitely recurse when applied inside the pre-target fire window', () => {
    // Regression: applying at 02:59:59.5 — inside the <=1s window before the
    // 03:00 target — used to re-arm `fire()` on now(), recomputing the SAME
    // still-future target, so `fire → scheduleNextChunk → fire` recursed
    // synchronously into a stack overflow that killed the scheduler.
    const { clock, scheduler, onReload } = setup(
      new Date(2026, 5, 26, 2, 59, 59, 500),
    )
    expect(() =>
      scheduler.apply({ enabled: true, time: '03:00' }),
    ).not.toThrow()
    expect(onReload).toHaveBeenCalledTimes(1)

    // And it re-armed for the NEXT day, not a past/identical target.
    clock.advance(25 * HOUR) // past the next day's 03:00
    expect(onReload).toHaveBeenCalledTimes(2)
  })

  it('stop() cancels any pending timer', () => {
    const { clock, scheduler, onReload } = setup(new Date(2026, 5, 26, 1, 0, 0))
    scheduler.apply({ enabled: true, time: '03:00' })
    scheduler.stop()
    expect(clock.pending).toBe(0)

    clock.advance(24 * HOUR)
    expect(onReload).not.toHaveBeenCalled()
  })
})

/**
 * The scheduler tests above all inject their own `onReload`, so none of them
 * would notice if the PRODUCTION wiring regressed back to a plain restart —
 * silently disabling OTA for the whole fleet while staying green. This pins it.
 */
describe('startDailyReload (production wiring)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('applies a pending shell update at the nightly window, not a plain restart', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 26, 2, 59, 30)) // 30s before the 03:00 window

    const stop = startDailyReload()
    await vi.advanceTimersByTimeAsync(31_000)

    expect(applyUpdateOrReload).toHaveBeenCalledTimes(1)
    // applyUpdateOrReload owns the restart decision (it must NOT double-restart
    // when Rust is already relaunching into the new version).
    expect(restartPlayer).not.toHaveBeenCalled()

    stop()
  })
})
