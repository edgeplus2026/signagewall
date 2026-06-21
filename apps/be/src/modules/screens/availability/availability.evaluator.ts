import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { RRule, Weekday } from 'rrule';

import {
  ScreenAvailability,
  ScreenAvailabilityMode,
  WeekdayKey,
  WeeklyDayHours,
} from '../schemas/screen.schema';

export interface AvailabilityWindow {
  start: Date;
  end: Date;
}

export interface AvailabilityTransition {
  at: Date;
  to: 'on' | 'off';
}

const MINUTES_PER_DAY = 24 * 60;

/** Look-ahead horizon for the next transition in weekly mode (covers a full week + overnight margin). */
const WEEKLY_HORIZON_DAYS = 14;

const WEEKDAY_TO_RRULE: Record<WeekdayKey, Weekday> = {
  [WeekdayKey.MONDAY]: RRule.MO,
  [WeekdayKey.TUESDAY]: RRule.TU,
  [WeekdayKey.WEDNESDAY]: RRule.WE,
  [WeekdayKey.THURSDAY]: RRule.TH,
  [WeekdayKey.FRIDAY]: RRule.FR,
  [WeekdayKey.SATURDAY]: RRule.SA,
  [WeekdayKey.SUNDAY]: RRule.SU,
};

/** JS getUTCDay() index (Sun=0..Sat=6) for each weekday key. */
const WEEKDAY_TO_JS_DAY: Record<WeekdayKey, number> = {
  [WeekdayKey.SUNDAY]: 0,
  [WeekdayKey.MONDAY]: 1,
  [WeekdayKey.TUESDAY]: 2,
  [WeekdayKey.WEDNESDAY]: 3,
  [WeekdayKey.THURSDAY]: 4,
  [WeekdayKey.FRIDAY]: 5,
  [WeekdayKey.SATURDAY]: 6,
};

/**
 * Computes when a screen is supposed to be on, from its availability config.
 *
 * Stateless and DB-free so it can be unit-tested exhaustively and reused by a
 * future device-sync endpoint.
 *
 * Timezone strategy: rrule only enumerates which *local calendar days* a window
 * starts on (it runs in naive/UTC space). luxon then converts each
 * `(localDay, 'HH:mm')` into an absolute instant in the screen's timezone, which
 * keeps DST correct without fighting rrule's own tz handling.
 */
@Injectable()
export class AvailabilityEvaluator {
  isOnAt(availability: ScreenAvailability | undefined, instant: Date): boolean {
    if (this.isAlwaysOn(availability)) {
      return true;
    }
    return this.findWindowAt(availability!, instant) !== undefined;
  }

  nextTransition(
    availability: ScreenAvailability | undefined,
    instant: Date,
  ): AvailabilityTransition | null {
    if (this.isAlwaysOn(availability)) {
      return null;
    }

    const horizonEnd = this.horizonEnd(availability!, instant);
    if (!horizonEnd || horizonEnd <= instant) {
      return null;
    }

    // Pad the start so an overnight window that began earlier is included.
    const rangeStart = new Date(instant.getTime() - MINUTES_PER_DAY * 60_000);
    const windows = this.getWindows(availability!, rangeStart, horizonEnd);

    const current = windows.find(
      (w) => w.start <= instant && instant < w.end,
    );
    if (current) {
      return { at: current.end, to: 'off' };
    }

    const upcoming = windows
      .filter((w) => w.start > instant)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
    return upcoming ? { at: upcoming.start, to: 'on' } : null;
  }

  /** The on-window covering `instant`, if the screen is on then. */
  currentWindow(
    availability: ScreenAvailability | undefined,
    instant: Date,
  ): AvailabilityWindow | undefined {
    if (this.isAlwaysOn(availability)) {
      return undefined;
    }
    return this.findWindowAt(availability!, instant);
  }

  /** Concrete on-windows (absolute UTC instants) overlapping [rangeStart, rangeEnd]. */
  getWindows(
    availability: ScreenAvailability,
    rangeStart: Date,
    rangeEnd: Date,
  ): AvailabilityWindow[] {
    if (availability.mode === ScreenAvailabilityMode.ALWAYS) {
      return [{ start: rangeStart, end: rangeEnd }];
    }
    if (availability.mode === ScreenAvailabilityMode.WEEKLY) {
      return this.weeklyWindows(availability, rangeStart, rangeEnd);
    }
    return this.specialWindows(availability, rangeStart, rangeEnd);
  }

  /** The window covering `instant`, if any. */
  private findWindowAt(
    availability: ScreenAvailability,
    instant: Date,
  ): AvailabilityWindow | undefined {
    // An active window can have started up to ~24h earlier (overnight), so pad
    // both sides of the probe range.
    const pad = MINUTES_PER_DAY * 60_000;
    const windows = this.getWindows(
      availability,
      new Date(instant.getTime() - pad),
      new Date(instant.getTime() + pad),
    );
    return windows.find((w) => w.start <= instant && instant < w.end);
  }

  private weeklyWindows(
    availability: ScreenAvailability,
    rangeStart: Date,
    rangeEnd: Date,
  ): AvailabilityWindow[] {
    const tz = availability.timezone;
    const enabled = availability.weekly.filter((d) => d.enabled);
    if (enabled.length === 0) {
      return [];
    }

    const configByJsDay = new Map<number, WeeklyDayHours>(
      enabled.map((d) => [WEEKDAY_TO_JS_DAY[d.day], d]),
    );

    // Pad by a day each side so overnight windows starting just outside the
    // range are still generated, then clipped by overlap below.
    const from = DateTime.fromJSDate(rangeStart, { zone: tz })
      .startOf('day')
      .minus({ days: 1 });
    const to = DateTime.fromJSDate(rangeEnd, { zone: tz })
      .startOf('day')
      .plus({ days: 1 });

    const rule = new RRule({
      freq: RRule.WEEKLY,
      byweekday: enabled.map((d) => WEEKDAY_TO_RRULE[d.day]),
      dtstart: this.naiveUtc(from.year, from.month, from.day),
      until: this.naiveUtc(to.year, to.month, to.day),
    });

    return this.windowsFromOccurrences(
      rule.all(),
      tz,
      (occ) => configByJsDay.get(occ.getUTCDay()),
      rangeStart,
      rangeEnd,
    );
  }

  private specialWindows(
    availability: ScreenAvailability,
    rangeStart: Date,
    rangeEnd: Date,
  ): AvailabilityWindow[] {
    const tz = availability.timezone;
    const { special } = availability;
    const startParts = this.parseDate(special.startDate);
    const endParts = this.parseDate(special.endDate);
    if (!startParts || !endParts) {
      return [];
    }

    const rule = new RRule({
      freq: RRule.DAILY,
      dtstart: this.naiveUtc(startParts.y, startParts.m, startParts.d),
      until: this.naiveUtc(endParts.y, endParts.m, endParts.d),
    });

    return this.windowsFromOccurrences(
      rule.all(),
      tz,
      () => special,
      rangeStart,
      rangeEnd,
    );
  }

  private windowsFromOccurrences(
    occurrences: Date[],
    tz: string,
    resolve: (occ: Date) => { start: string; end: string } | undefined,
    rangeStart: Date,
    rangeEnd: Date,
  ): AvailabilityWindow[] {
    const windows: AvailabilityWindow[] = [];
    for (const occ of occurrences) {
      const config = resolve(occ);
      if (!config) {
        continue;
      }
      const window = this.buildWindow(
        tz,
        occ.getUTCFullYear(),
        occ.getUTCMonth() + 1,
        occ.getUTCDate(),
        config.start,
        config.end,
      );
      if (window && window.end > rangeStart && window.start < rangeEnd) {
        windows.push(window);
      }
    }
    return this.mergeWindows(windows);
  }

  /**
   * Sorts and coalesces overlapping or touching windows so a continuous on-period
   * spanning multiple source windows is represented as one interval. Without this,
   * `nextTransition` could report a spurious off at the seam between two windows.
   */
  private mergeWindows(windows: AvailabilityWindow[]): AvailabilityWindow[] {
    const sorted = [...windows].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    const merged: AvailabilityWindow[] = [];
    for (const window of sorted) {
      const last = merged[merged.length - 1];
      if (last && window.start.getTime() <= last.end.getTime()) {
        if (window.end.getTime() > last.end.getTime()) {
          last.end = window.end;
        }
      } else {
        merged.push({ start: window.start, end: window.end });
      }
    }
    return merged;
  }

  /**
   * Builds an absolute window from a local day + 'HH:mm' start/end. Working hours
   * never cross midnight, so `end` must be strictly after `start`. Both endpoints
   * are resolved as wall-clock in `tz` (DST-aware); a time that does not exist on
   * a spring-forward day is rejected rather than silently shifted.
   */
  private buildWindow(
    tz: string,
    year: number,
    month: number,
    day: number,
    startHHmm: string,
    endHHmm: string,
  ): AvailabilityWindow | null {
    const startMin = this.parseMinutes(startHHmm);
    const endMin = this.parseMinutes(endHHmm);
    if (startMin === null || endMin === null || endMin <= startMin) {
      return null;
    }

    const start = this.localWallClock(tz, year, month, day, startMin);
    const end = this.localWallClock(tz, year, month, day, endMin);
    if (!start || !end) {
      return null;
    }
    return { start: start.toJSDate(), end: end.toJSDate() };
  }

  /**
   * Resolves a local wall-clock minute-of-day to an absolute instant in `tz`.
   * Returns null when that local time does not exist (DST gap) — luxon would
   * otherwise silently shift it forward, changing the configured on/off time.
   */
  private localWallClock(
    tz: string,
    year: number,
    month: number,
    day: number,
    minuteOfDay: number,
  ): DateTime | null {
    const dt = DateTime.fromObject(
      {
        year,
        month,
        day,
        hour: Math.floor(minuteOfDay / 60),
        minute: minuteOfDay % 60,
      },
      { zone: tz },
    );
    if (!dt.isValid) {
      return null;
    }
    // luxon maps a non-existent local time (spring-forward gap) to a different
    // wall-clock; detect that and reject instead of silently shifting.
    if (dt.hour * 60 + dt.minute !== minuteOfDay) {
      return null;
    }
    return dt;
  }

  /** End of the look-ahead window for `nextTransition`; null when nothing recurs after `instant`. */
  private horizonEnd(
    availability: ScreenAvailability,
    instant: Date,
  ): Date | null {
    if (availability.mode === ScreenAvailabilityMode.WEEKLY) {
      return new Date(
        instant.getTime() + WEEKLY_HORIZON_DAYS * MINUTES_PER_DAY * 60_000,
      );
    }

    const endParts = this.parseDate(availability.special.endDate);
    if (!endParts) {
      return null;
    }
    // Allow two extra days so an overnight window on the last date is included.
    const end = DateTime.fromObject(
      { year: endParts.y, month: endParts.m, day: endParts.d },
      { zone: availability.timezone },
    )
      .plus({ days: 2 })
      .toJSDate();
    return end;
  }

  private isAlwaysOn(availability: ScreenAvailability | undefined): boolean {
    return !availability || availability.mode === ScreenAvailabilityMode.ALWAYS;
  }

  private naiveUtc(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
  }

  private parseMinutes(value: string): number | null {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (!match) {
      return null;
    }
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private parseDate(
    value: string,
  ): { y: number; m: number; d: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const dt = DateTime.fromObject({ year: y, month: m, day: d });
    if (!dt.isValid) {
      return null;
    }
    return { y, m, d };
  }
}
