import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AvailabilityRule,
  AvailabilityWeekday,
  isAvailabilityOn,
  nextAvailabilityBoundary,
} from './availability.js'

/**
 * Fixtures are a direct port of the backend oracle
 * (apps/be/src/modules/screens/availability/availability.evaluator.spec.ts)
 * so the shared Intl evaluator and the backend luxon/rrule evaluator are pinned
 * to identical semantics.
 */

const TZ = 'Europe/Belgrade' // CET (UTC+1) winter, CEST (UTC+2) summer

const ALL_DAYS: AvailabilityWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function weeklyRule(
  overrides: Partial<Record<AvailabilityWeekday, { start: string; end: string }>>,
): AvailabilityRule {
  return {
    mode: 'weekly',
    timezone: TZ,
    weekly: ALL_DAYS.map((day) => {
      const override = overrides[day]
      return {
        day,
        enabled: Boolean(override),
        start: override?.start ?? '09:00',
        end: override?.end ?? '17:00',
      }
    }),
  }
}

function specialRule(special: {
  startDate: string
  endDate: string
  start: string
  end: string
}): AvailabilityRule {
  return { mode: 'special', timezone: TZ, special }
}

const utc = (iso: string) => new Date(iso)

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('always-on', () => {
  it('is always on and never transitions', () => {
    const rule: AvailabilityRule = { mode: 'always', timezone: TZ }
    expect(isAvailabilityOn(rule, utc('2026-06-01T03:00:00Z'))).toBe(true)
    expect(isAvailabilityOn(rule, utc('2026-12-25T23:59:00Z'))).toBe(true)
    expect(nextAvailabilityBoundary(rule, utc('2026-06-01T03:00:00Z'))).toBeNull()
  })

  it('treats a missing rule as always-on', () => {
    expect(isAvailabilityOn(undefined, utc('2026-06-01T03:00:00Z'))).toBe(true)
    expect(nextAvailabilityBoundary(undefined, utc('2026-06-01T03:00:00Z'))).toBeNull()
  })
})

describe('weekly', () => {
  // Monday 09:00–17:00 local; summer ⇒ window [07:00Z, 15:00Z]. 2026-06-01 is a Monday.
  const monOnly = weeklyRule({ monday: { start: '09:00', end: '17:00' } })

  it('is on inside the window and off outside it', () => {
    expect(isAvailabilityOn(monOnly, utc('2026-06-01T08:00:00Z'))).toBe(true) // 10:00 local
    expect(isAvailabilityOn(monOnly, utc('2026-06-01T06:00:00Z'))).toBe(false) // 08:00 local
    expect(isAvailabilityOn(monOnly, utc('2026-06-01T16:00:00Z'))).toBe(false) // 18:00 local
  })

  it('is off all day on disabled days', () => {
    expect(isAvailabilityOn(monOnly, utc('2026-06-02T08:00:00Z'))).toBe(false) // Tuesday
    expect(isAvailabilityOn(monOnly, utc('2026-06-02T12:00:00Z'))).toBe(false)
  })

  it('is off with no boundary when no days are enabled', () => {
    const none = weeklyRule({})
    expect(isAvailabilityOn(none, utc('2026-06-01T08:00:00Z'))).toBe(false)
    expect(nextAvailabilityBoundary(none, utc('2026-06-01T08:00:00Z'))).toBeNull()
  })

  it('produces no window for a reversed (would-be overnight) range', () => {
    // 18:00–02:00 is not a valid same-day window; nothing is emitted.
    const reversed = weeklyRule({ friday: { start: '18:00', end: '02:00' } })
    expect(isAvailabilityOn(reversed, utc('2026-06-05T20:00:00Z'))).toBe(false)
    expect(isAvailabilityOn(reversed, utc('2026-06-05T23:30:00Z'))).toBe(false)
    expect(nextAvailabilityBoundary(reversed, utc('2026-06-05T20:00:00Z'))).toBeNull()
  })

  it('drops a day whose times are malformed', () => {
    const malformed = weeklyRule({ monday: { start: '9:00', end: '17:00' } })
    expect(isAvailabilityOn(malformed, utc('2026-06-01T08:00:00Z'))).toBe(false)
    expect(nextAvailabilityBoundary(malformed, utc('2026-06-01T08:00:00Z'))).toBeNull()

    const hour24 = weeklyRule({ monday: { start: '09:00', end: '24:00' } })
    expect(isAvailabilityOn(hour24, utc('2026-06-01T08:00:00Z'))).toBe(false)
  })

  it('reports a single clean boundary for a long same-day window', () => {
    // 2026-06-01 Monday, summer ⇒ window [06:00Z, 18:00Z].
    const monLong = weeklyRule({ monday: { start: '08:00', end: '20:00' } })
    expect(nextAvailabilityBoundary(monLong, utc('2026-06-01T10:00:00Z'))).toEqual(
      utc('2026-06-01T18:00:00Z'),
    )
  })

  it('reports the window end as the next boundary when currently on', () => {
    expect(nextAvailabilityBoundary(monOnly, utc('2026-06-01T08:00:00Z'))).toEqual(
      utc('2026-06-01T15:00:00Z'),
    )
  })

  it('reports the open later the same day when off before open', () => {
    expect(nextAvailabilityBoundary(monOnly, utc('2026-06-01T06:00:00Z'))).toEqual(
      utc('2026-06-01T07:00:00Z'),
    )
  })

  it('reports next week as the next boundary after the window closes', () => {
    expect(nextAvailabilityBoundary(monOnly, utc('2026-06-01T16:00:00Z'))).toEqual(
      utc('2026-06-08T07:00:00Z'),
    )
  })

  it('preserves wall-clock time across DST (winter offset differs from summer)', () => {
    // Winter Monday 2026-01-05: UTC+1 ⇒ 09:00 local = 08:00Z (vs 07:00Z in summer).
    expect(isAvailabilityOn(monOnly, utc('2026-01-05T08:30:00Z'))).toBe(true) // 09:30 local
    expect(isAvailabilityOn(monOnly, utc('2026-01-05T07:30:00Z'))).toBe(false) // 08:30 local
  })

  it('evaluates correctly far in the future (long-offline device)', () => {
    // 30 and 60 days after 2026-06-01: 2026-07-06 and 2026-08-03 are Mondays.
    expect(isAvailabilityOn(monOnly, utc('2026-07-06T08:00:00Z'))).toBe(true)
    expect(isAvailabilityOn(monOnly, utc('2026-08-03T08:00:00Z'))).toBe(true)
    expect(isAvailabilityOn(monOnly, utc('2026-08-04T08:00:00Z'))).toBe(false) // Tuesday
    expect(nextAvailabilityBoundary(monOnly, utc('2026-07-06T16:00:00Z'))).toEqual(
      utc('2026-07-13T07:00:00Z'),
    )
  })

  it('is on at the exact window start and off at the exact window end', () => {
    // [start, end): boundaries returned are strictly future (no hot-looping).
    expect(isAvailabilityOn(monOnly, utc('2026-06-01T07:00:00Z'))).toBe(true)
    expect(nextAvailabilityBoundary(monOnly, utc('2026-06-01T07:00:00Z'))).toEqual(
      utc('2026-06-01T15:00:00Z'),
    )
    expect(isAvailabilityOn(monOnly, utc('2026-06-01T15:00:00Z'))).toBe(false)
    expect(nextAvailabilityBoundary(monOnly, utc('2026-06-01T15:00:00Z'))).toEqual(
      utc('2026-06-08T07:00:00Z'),
    )
  })
})

describe('DST', () => {
  // Europe/Belgrade 2026-03-29 (Sunday): spring-forward, 02:00→03:00 local gap.
  const sundayGap = weeklyRule({ sunday: { start: '02:30', end: '04:00' } })

  it('rejects a non-existent local start time on a spring-forward day', () => {
    // 02:30 local is in the gap → no window is produced for that day.
    expect(isAvailabilityOn(sundayGap, utc('2026-03-29T02:00:00Z'))).toBe(false)
  })

  it('skips the dropped day and finds the next real occurrence', () => {
    // From Sunday 00:00 local (2026-03-28T23:00Z, still UTC+1) the gap kills
    // that day's window; next Sunday 2026-04-05 02:30 CEST = 00:30Z.
    expect(nextAvailabilityBoundary(sundayGap, utc('2026-03-28T23:00:00Z'))).toEqual(
      utc('2026-04-05T00:30:00Z'),
    )
  })

  it('stretches through a transition when both endpoints exist', () => {
    // Sunday 01:00–04:00 across the gap: 01:00 CET = 00:00Z, 04:00 CEST = 02:00Z.
    const acrossGap = weeklyRule({ sunday: { start: '01:00', end: '04:00' } })
    expect(isAvailabilityOn(acrossGap, utc('2026-03-29T01:30:00Z'))).toBe(true)
    expect(nextAvailabilityBoundary(acrossGap, utc('2026-03-29T00:30:00Z'))).toEqual(
      utc('2026-03-29T02:00:00Z'),
    )
  })

  it('resolves a fall-back fold to the earlier instant (luxon parity, pinned)', () => {
    // 2026-10-25: at 03:00 CEST clocks fall back to 02:00 CET, so 02:30 local
    // happens twice — 00:30Z (UTC+2) and 01:30Z (UTC+1). The earlier wins.
    const foldStart = weeklyRule({ sunday: { start: '02:30', end: '05:00' } })
    expect(nextAvailabilityBoundary(foldStart, utc('2026-10-24T23:00:00Z'))).toEqual(
      utc('2026-10-25T00:30:00Z'),
    )
    expect(isAvailabilityOn(foldStart, utc('2026-10-25T00:45:00Z'))).toBe(true)
  })
})

describe('special', () => {
  const range = specialRule({
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    start: '09:00',
    end: '17:00',
  })

  it('is on within the date range during hours', () => {
    expect(isAvailabilityOn(range, utc('2026-06-11T08:00:00Z'))).toBe(true) // 10:00 local
  })

  it('is off before and after the date range', () => {
    expect(isAvailabilityOn(range, utc('2026-06-09T08:00:00Z'))).toBe(false)
    expect(isAvailabilityOn(range, utc('2026-06-13T08:00:00Z'))).toBe(false)
  })

  it('has no further boundary once the range has passed (off forever)', () => {
    expect(nextAvailabilityBoundary(range, utc('2026-06-13T08:00:00Z'))).toBeNull()
  })

  it('reports the first open when before the range starts', () => {
    expect(nextAvailabilityBoundary(range, utc('2026-06-09T08:00:00Z'))).toEqual(
      utc('2026-06-10T07:00:00Z'),
    )
  })

  it('finds a range starting beyond the day-scan cap (anchor jump)', () => {
    const farFuture = specialRule({
      startDate: '2026-07-10',
      endDate: '2026-07-12',
      start: '09:00',
      end: '17:00',
    })
    expect(nextAvailabilityBoundary(farFuture, utc('2026-06-01T00:00:00Z'))).toEqual(
      utc('2026-07-10T07:00:00Z'),
    )
  })

  it('supports a single-day range', () => {
    const oneDay = specialRule({
      startDate: '2026-06-10',
      endDate: '2026-06-10',
      start: '09:00',
      end: '17:00',
    })
    expect(isAvailabilityOn(oneDay, utc('2026-06-10T08:00:00Z'))).toBe(true)
    expect(isAvailabilityOn(oneDay, utc('2026-06-11T08:00:00Z'))).toBe(false)
    expect(nextAvailabilityBoundary(oneDay, utc('2026-06-10T16:00:00Z'))).toBeNull()
  })

  it('produces no window for a reversed time range', () => {
    const reversed = specialRule({
      startDate: '2026-06-10',
      endDate: '2026-06-10',
      start: '22:00',
      end: '02:00',
    })
    expect(isAvailabilityOn(reversed, utc('2026-06-10T23:00:00Z'))).toBe(false)
  })

  it('is off for a reversed date range', () => {
    const reversedDates = specialRule({
      startDate: '2026-06-12',
      endDate: '2026-06-10',
      start: '09:00',
      end: '17:00',
    })
    expect(isAvailabilityOn(reversedDates, utc('2026-06-11T08:00:00Z'))).toBe(false)
    expect(
      nextAvailabilityBoundary(reversedDates, utc('2026-06-09T08:00:00Z')),
    ).toBeNull()
  })
})

describe('fail-open on structurally broken payloads', () => {
  const at = utc('2026-06-01T08:00:00Z')

  it('treats an invalid timezone as always-on and warns once', () => {
    const rule = weeklyRule({ monday: { start: '09:00', end: '17:00' } })
    const broken = { ...rule, timezone: 'Not/AZone' }
    expect(isAvailabilityOn(broken, at)).toBe(true)
    expect(nextAvailabilityBoundary(broken, at)).toBeNull()
    expect(isAvailabilityOn(broken, at)).toBe(true)
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it('treats an unknown mode as always-on', () => {
    const broken = { mode: 'lunar', timezone: TZ } as unknown as AvailabilityRule
    expect(isAvailabilityOn(broken, at)).toBe(true)
    expect(nextAvailabilityBoundary(broken, at)).toBeNull()
  })

  it('treats weekly mode without a weekly array as always-on', () => {
    const broken: AvailabilityRule = { mode: 'weekly', timezone: TZ }
    expect(isAvailabilityOn(broken, at)).toBe(true)
    expect(nextAvailabilityBoundary(broken, at)).toBeNull()
  })

  it('treats special mode without a special block as always-on', () => {
    const broken: AvailabilityRule = { mode: 'special', timezone: TZ }
    expect(isAvailabilityOn(broken, at)).toBe(true)
    expect(nextAvailabilityBoundary(broken, at)).toBeNull()
  })

  it('treats malformed special dates as always-on', () => {
    const broken = specialRule({
      startDate: '2026-13-99',
      endDate: '2026-06-12',
      start: '09:00',
      end: '17:00',
    })
    expect(isAvailabilityOn(broken, at)).toBe(true)
    const impossible = specialRule({
      startDate: '2026-02-31',
      endDate: '2026-03-01',
      start: '09:00',
      end: '17:00',
    })
    expect(isAvailabilityOn(impossible, at)).toBe(true)
  })

  it('works with a partial weekly array (only some days present)', () => {
    const partial: AvailabilityRule = {
      mode: 'weekly',
      timezone: TZ,
      weekly: [{ day: 'monday', enabled: true, start: '09:00', end: '17:00' }],
    }
    expect(isAvailabilityOn(partial, utc('2026-06-01T08:00:00Z'))).toBe(true)
    expect(isAvailabilityOn(partial, utc('2026-06-02T08:00:00Z'))).toBe(false)
  })
})
