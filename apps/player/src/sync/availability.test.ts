import { describe, expect, it, vi } from 'vitest'

import { FakeClock } from '../../test/fake-clock'
import type { AvailabilityRule } from '../types'
import { AvailabilityScheduler } from './availability'

// The module imports the store only for the `startAvailability` wiring helper.
// Stub it so importing the unit under test has no browser/runtime side effects.
vi.mock('../store', () => ({
  availabilityOn: { value: true },
  snapshot: { value: null },
}))

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const TZ = 'Europe/Belgrade' // UTC+2 in June (CEST)

/** Monday 09:00–17:00 local ⇒ [07:00Z, 15:00Z) in summer. */
function mondayRule(): AvailabilityRule {
  return {
    mode: 'weekly',
    timezone: TZ,
    weekly: [
      { day: 'monday', enabled: true, start: '09:00', end: '17:00' },
    ],
  }
}

function setup(startMs: number) {
  const clock = new FakeClock(startMs)
  const setOn = vi.fn()
  const scheduler = new AvailabilityScheduler({
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    setOn,
  })
  const lastOn = () => setOn.mock.calls.at(-1)?.[0] as boolean | undefined
  return { clock, scheduler, setOn, lastOn }
}

// 2026-06-01 is a Monday.
const MONDAY_08Z = Date.UTC(2026, 5, 1, 8) // 10:00 local, inside the window
const MONDAY_06Z = Date.UTC(2026, 5, 1, 6) // 08:00 local, before open

describe('AvailabilityScheduler', () => {
  it('is on with no timer when there is no rule', () => {
    const { clock, scheduler, setOn } = setup(MONDAY_08Z)
    scheduler.apply(undefined)

    expect(setOn).toHaveBeenLastCalledWith(true)
    expect(clock.pending).toBe(0)
  })

  it('is on with no timer for an always rule', () => {
    const { clock, scheduler, setOn } = setup(MONDAY_08Z)
    scheduler.apply({ mode: 'always', timezone: TZ })

    expect(setOn).toHaveBeenLastCalledWith(true)
    expect(clock.pending).toBe(0)
  })

  it('turns on inside the window and flips to standby at the close', () => {
    const { clock, scheduler, lastOn } = setup(MONDAY_08Z)
    scheduler.apply(mondayRule())
    expect(lastOn()).toBe(true)

    clock.advance(6 * HOUR + 59 * 60 * 1000) // 14:59Z — still on
    expect(lastOn()).toBe(true)

    clock.advance(60 * 1000) // 15:00Z — window closes
    expect(lastOn()).toBe(false)
  })

  it('starts in standby before open and turns on at the boundary', () => {
    const { clock, scheduler, lastOn } = setup(MONDAY_06Z)
    scheduler.apply(mondayRule())
    expect(lastOn()).toBe(false)

    clock.advance(HOUR) // 07:00Z — window opens
    expect(lastOn()).toBe(true)
  })

  it('sleeps in coarse chunks — one armed timer, no fine polling', () => {
    const { clock, scheduler } = setup(MONDAY_08Z)
    scheduler.apply(mondayRule())
    expect(clock.pending).toBe(1)

    clock.advance(2 * HOUR)
    expect(clock.pending).toBe(1)
  })

  it('recomputes across boundaries skipped while the device slept', () => {
    const { clock, scheduler, lastOn } = setup(MONDAY_08Z)
    scheduler.apply(mondayRule())
    expect(lastOn()).toBe(true)

    // Sleep a whole week: crosses off (Mon 15:00Z) and on (next Mon 07:00Z).
    // A blind toggle would land wrong; the recomputation lands on.
    clock.jump(7 * DAY)
    expect(lastOn()).toBe(true)

    // And the loop is still live: next close still flips to standby.
    clock.advance(7 * HOUR)
    expect(lastOn()).toBe(false)
  })

  it('wakes into standby when sleep ended outside the window', () => {
    const { clock, scheduler, lastOn } = setup(MONDAY_08Z)
    scheduler.apply(mondayRule())

    clock.jump(31 * HOUR) // Tuesday 15:00Z — off day
    expect(lastOn()).toBe(false)
  })

  it('rebases when the rule changes, clearing the old timer', () => {
    const { clock, scheduler, setOn } = setup(MONDAY_08Z)
    scheduler.apply(mondayRule())
    expect(clock.pending).toBe(1)

    scheduler.apply({ mode: 'always', timezone: TZ })
    expect(setOn).toHaveBeenLastCalledWith(true)
    expect(clock.pending).toBe(0)
  })

  it('is off forever with no timer once a special range has passed', () => {
    const { clock, scheduler, setOn } = setup(Date.UTC(2026, 5, 20, 12))
    scheduler.apply({
      mode: 'special',
      timezone: TZ,
      special: {
        startDate: '2026-06-10',
        endDate: '2026-06-12',
        start: '09:00',
        end: '17:00',
      },
    })

    // Confirmed product semantics: past endDate the screen stays dark and
    // nothing is armed — only a rule change wakes it.
    expect(setOn).toHaveBeenLastCalledWith(false)
    expect(clock.pending).toBe(0)
  })

  it('stop() clears timers and resets to on (never strands a black screen)', () => {
    const { clock, scheduler, setOn } = setup(MONDAY_06Z)
    scheduler.apply(mondayRule())
    expect(setOn).toHaveBeenLastCalledWith(false)
    expect(clock.pending).toBe(1)

    scheduler.stop()
    expect(setOn).toHaveBeenLastCalledWith(true)
    expect(clock.pending).toBe(0)
  })
})
