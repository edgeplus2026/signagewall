import {
  ScreenAvailability,
  ScreenAvailabilityMode,
  WeekdayKey,
  WeeklyDayHours,
} from '../schemas/screen.schema';
import { AvailabilityEvaluator } from './availability.evaluator';
import {
  AvailabilityValidationError,
  validateAvailability,
} from './availability.validation';

const TZ = 'Europe/Belgrade'; // CET (UTC+1) winter, CEST (UTC+2) summer

const ALL_DAYS: WeekdayKey[] = [
  WeekdayKey.MONDAY,
  WeekdayKey.TUESDAY,
  WeekdayKey.WEDNESDAY,
  WeekdayKey.THURSDAY,
  WeekdayKey.FRIDAY,
  WeekdayKey.SATURDAY,
  WeekdayKey.SUNDAY,
];

function weeklyAvailability(
  overrides: Partial<Record<WeekdayKey, { start: string; end: string }>>,
): ScreenAvailability {
  const weekly: WeeklyDayHours[] = ALL_DAYS.map((day) => {
    const override = overrides[day];
    return {
      day,
      enabled: Boolean(override),
      start: override?.start ?? '09:00',
      end: override?.end ?? '17:00',
    };
  });

  return {
    mode: ScreenAvailabilityMode.WEEKLY,
    timezone: TZ,
    weekly,
    special: { startDate: '2026-01-01', endDate: '2026-01-01', start: '09:00', end: '17:00' },
  } as ScreenAvailability;
}

function specialAvailability(special: {
  startDate: string;
  endDate: string;
  start: string;
  end: string;
}): ScreenAvailability {
  return {
    mode: ScreenAvailabilityMode.SPECIAL,
    timezone: TZ,
    weekly: ALL_DAYS.map((day) => ({ day, enabled: false, start: '09:00', end: '17:00' })),
    special,
  } as ScreenAvailability;
}

function alwaysAvailability(): ScreenAvailability {
  return {
    mode: ScreenAvailabilityMode.ALWAYS,
    timezone: TZ,
    weekly: ALL_DAYS.map((day) => ({ day, enabled: false, start: '09:00', end: '17:00' })),
    special: { startDate: '2026-01-01', endDate: '2026-01-01', start: '09:00', end: '17:00' },
  } as ScreenAvailability;
}

const utc = (iso: string) => new Date(iso);

describe('AvailabilityEvaluator', () => {
  const evaluator = new AvailabilityEvaluator();

  describe('always-on', () => {
    it('is always on and never transitions', () => {
      const a = alwaysAvailability();
      expect(evaluator.isOnAt(a, utc('2026-06-01T03:00:00Z'))).toBe(true);
      expect(evaluator.isOnAt(a, utc('2026-12-25T23:59:00Z'))).toBe(true);
      expect(evaluator.nextTransition(a, utc('2026-06-01T03:00:00Z'))).toBeNull();
    });

    it('treats missing availability as always-on', () => {
      expect(evaluator.isOnAt(undefined, utc('2026-06-01T03:00:00Z'))).toBe(true);
      expect(evaluator.nextTransition(undefined, utc('2026-06-01T03:00:00Z'))).toBeNull();
    });
  });

  describe('weekly', () => {
    // Monday 09:00–17:00 local; summer ⇒ window [07:00Z, 15:00Z]. 2026-06-01 is a Monday.
    const monOnly = weeklyAvailability({ [WeekdayKey.MONDAY]: { start: '09:00', end: '17:00' } });

    it('is on inside the window and off outside it', () => {
      expect(evaluator.isOnAt(monOnly, utc('2026-06-01T08:00:00Z'))).toBe(true); // 10:00 local
      expect(evaluator.isOnAt(monOnly, utc('2026-06-01T06:00:00Z'))).toBe(false); // 08:00 local
      expect(evaluator.isOnAt(monOnly, utc('2026-06-01T16:00:00Z'))).toBe(false); // 18:00 local
    });

    it('is off all day on disabled days', () => {
      expect(evaluator.isOnAt(monOnly, utc('2026-06-02T08:00:00Z'))).toBe(false); // Tuesday
      expect(evaluator.isOnAt(monOnly, utc('2026-06-02T12:00:00Z'))).toBe(false);
    });

    it('is off when no days are enabled', () => {
      const none = weeklyAvailability({});
      expect(evaluator.isOnAt(none, utc('2026-06-01T08:00:00Z'))).toBe(false);
      expect(evaluator.nextTransition(none, utc('2026-06-01T08:00:00Z'))).toBeNull();
    });

    it('produces no window for a reversed (would-be overnight) range', () => {
      // 18:00–02:00 is not a valid same-day window; the evaluator emits nothing.
      const reversed = weeklyAvailability({
        [WeekdayKey.FRIDAY]: { start: '18:00', end: '02:00' },
      });
      expect(evaluator.isOnAt(reversed, utc('2026-06-05T20:00:00Z'))).toBe(false);
      expect(evaluator.isOnAt(reversed, utc('2026-06-05T23:30:00Z'))).toBe(false);
    });

    it('reports a single clean transition for a long same-day window', () => {
      // Regression guard for window merging: one long Monday window must yield
      // exactly one off-transition at its true end, not a seam in the middle.
      const monLong = weeklyAvailability({
        [WeekdayKey.MONDAY]: { start: '08:00', end: '20:00' },
      });
      // 2026-06-01 Monday, summer ⇒ window [06:00Z, 18:00Z].
      expect(evaluator.nextTransition(monLong, utc('2026-06-01T10:00:00Z'))).toEqual({
        at: utc('2026-06-01T18:00:00Z'),
        to: 'off',
      });
    });

    it('rejects a non-existent local start time on a DST spring-forward day', () => {
      // Europe/Belgrade 2026-03-29 is a Sunday: 02:00→03:00 gap, so 02:30 does not exist.
      const sundayGap = weeklyAvailability({
        [WeekdayKey.SUNDAY]: { start: '02:30', end: '04:00' },
      });
      // 02:30 local is in the gap → no window is produced for that day.
      expect(evaluator.isOnAt(sundayGap, utc('2026-03-29T02:00:00Z'))).toBe(false);
    });

    it('reports the next transition off when currently on', () => {
      const t = evaluator.nextTransition(monOnly, utc('2026-06-01T08:00:00Z'));
      expect(t).toEqual({ at: utc('2026-06-01T15:00:00Z'), to: 'off' });
    });

    it('reports the next transition on later the same day when off before open', () => {
      const t = evaluator.nextTransition(monOnly, utc('2026-06-01T06:00:00Z'));
      expect(t).toEqual({ at: utc('2026-06-01T07:00:00Z'), to: 'on' });
    });

    it('reports the next on as next week after the window closes', () => {
      const t = evaluator.nextTransition(monOnly, utc('2026-06-01T16:00:00Z'));
      expect(t).toEqual({ at: utc('2026-06-08T07:00:00Z'), to: 'on' });
    });

    it('preserves wall-clock time across DST (winter offset differs from summer)', () => {
      // Winter Monday 2026-01-05: UTC+1 ⇒ 09:00 local = 08:00Z (vs 07:00Z in summer).
      expect(evaluator.isOnAt(monOnly, utc('2026-01-05T08:30:00Z'))).toBe(true); // 09:30 local
      expect(evaluator.isOnAt(monOnly, utc('2026-01-05T07:30:00Z'))).toBe(false); // 08:30 local
    });
  });

  describe('special', () => {
    const range = specialAvailability({
      startDate: '2026-06-10',
      endDate: '2026-06-12',
      start: '09:00',
      end: '17:00',
    });

    it('is on within the date range during hours', () => {
      expect(evaluator.isOnAt(range, utc('2026-06-11T08:00:00Z'))).toBe(true); // 10:00 local
    });

    it('is off before and after the date range', () => {
      expect(evaluator.isOnAt(range, utc('2026-06-09T08:00:00Z'))).toBe(false);
      expect(evaluator.isOnAt(range, utc('2026-06-13T08:00:00Z'))).toBe(false);
    });

    it('has no further transition once the range has passed', () => {
      expect(evaluator.nextTransition(range, utc('2026-06-13T08:00:00Z'))).toBeNull();
    });

    it('reports the first on when before the range starts', () => {
      const t = evaluator.nextTransition(range, utc('2026-06-09T08:00:00Z'));
      expect(t).toEqual({ at: utc('2026-06-10T07:00:00Z'), to: 'on' });
    });

    it('supports a single-day range', () => {
      const oneDay = specialAvailability({
        startDate: '2026-06-10',
        endDate: '2026-06-10',
        start: '09:00',
        end: '17:00',
      });
      expect(evaluator.isOnAt(oneDay, utc('2026-06-10T08:00:00Z'))).toBe(true);
      expect(evaluator.isOnAt(oneDay, utc('2026-06-11T08:00:00Z'))).toBe(false);
    });

    it('produces no window for a reversed time range', () => {
      const reversed = specialAvailability({
        startDate: '2026-06-10',
        endDate: '2026-06-10',
        start: '22:00',
        end: '02:00',
      });
      expect(evaluator.isOnAt(reversed, utc('2026-06-10T23:00:00Z'))).toBe(false);
    });
  });
});

describe('validateAvailability', () => {
  it('accepts a valid weekly config', () => {
    const a = weeklyAvailability({ [WeekdayKey.MONDAY]: { start: '09:00', end: '17:00' } });
    expect(validateAvailability(a)).toBeNull();
  });

  it('rejects an enabled day where start is not before end (equal)', () => {
    const a = weeklyAvailability({ [WeekdayKey.MONDAY]: { start: '09:00', end: '09:00' } });
    expect(validateAvailability(a)).toBe(AvailabilityValidationError.INVALID_TIME_RANGE);
  });

  it('rejects an enabled day where start is after end (reversed)', () => {
    const a = weeklyAvailability({ [WeekdayKey.MONDAY]: { start: '17:00', end: '09:00' } });
    expect(validateAvailability(a)).toBe(AvailabilityValidationError.INVALID_TIME_RANGE);
  });

  it('rejects an invalid timezone', () => {
    const a = weeklyAvailability({});
    (a as { timezone: string }).timezone = 'Not/AZone';
    expect(validateAvailability(a)).toBe(AvailabilityValidationError.INVALID_TIMEZONE);
  });

  it('rejects a special range where end date is before start date', () => {
    const a = specialAvailability({
      startDate: '2026-06-12',
      endDate: '2026-06-10',
      start: '09:00',
      end: '17:00',
    });
    expect(validateAvailability(a)).toBe(AvailabilityValidationError.INVALID_DATE_RANGE);
  });

  it('rejects a special block with an impossible calendar date', () => {
    const a = specialAvailability({
      startDate: '2026-02-30',
      endDate: '2026-03-01',
      start: '09:00',
      end: '17:00',
    });
    expect(validateAvailability(a)).toBe(AvailabilityValidationError.INVALID_DATE);
  });

  it('rejects a special block where start time is after end time', () => {
    const a = specialAvailability({
      startDate: '2026-06-10',
      endDate: '2026-06-12',
      start: '17:00',
      end: '09:00',
    });
    expect(validateAvailability(a)).toBe(AvailabilityValidationError.INVALID_TIME_RANGE);
  });

  it('validates the special block even when mode is weekly', () => {
    const a = weeklyAvailability({ [WeekdayKey.MONDAY]: { start: '09:00', end: '17:00' } });
    a.special = { startDate: '2026-06-12', endDate: '2026-06-10', start: '09:00', end: '17:00' };
    expect(validateAvailability(a)).toBe(AvailabilityValidationError.INVALID_DATE_RANGE);
  });

  it('rejects an incomplete weekly list', () => {
    const a = weeklyAvailability({});
    a.weekly = a.weekly.slice(0, 5);
    expect(validateAvailability(a)).toBe(AvailabilityValidationError.INCOMPLETE_WEEKLY);
  });
});
