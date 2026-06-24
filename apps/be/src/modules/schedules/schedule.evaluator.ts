import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { RRule, Weekday } from 'rrule';

import {
  ScheduleContentType,
  ScheduleEventType,
  ScheduleFit,
  ScheduleRepeat,
} from './schemas/schedule.schema';

/**
 * Plain, Mongoose-free event shape the evaluator works on. The service maps
 * `ScheduleEventDocument` → this (ObjectId → string) so the engine stays DB-free
 * and exhaustively unit-testable, and so the service can drop events whose
 * content was deleted before evaluating (null-safety).
 */
export interface EvaluableEvent {
  id: string;
  type: ScheduleEventType;
  contentType?: ScheduleContentType;
  mediaId?: string;
  playlistId?: string;
  fit?: ScheduleFit;
  repeat: ScheduleRepeat;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  excludedDates: string[];
  order: number;
}

export interface EvaluableFiller {
  contentType: ScheduleContentType;
  mediaId?: string;
  playlistId?: string;
  fit: ScheduleFit;
}

export interface ResolvedWindow {
  start: Date;
  end: Date;
  eventId: string;
  type: ScheduleEventType;
  contentType?: ScheduleContentType;
  mediaId?: string;
  playlistId?: string;
  fit?: ScheduleFit;
  order: number;
}

export type ScheduleResolutionState = 'content' | 'off' | 'filler';

export interface ScheduleResolution {
  state: ScheduleResolutionState;
  eventId?: string;
  contentType?: ScheduleContentType;
  mediaId?: string;
  playlistId?: string;
  fit?: ScheduleFit;
  window?: { start: Date; end: Date };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** luxon weekday (1=Mon..7=Sun) → rrule weekday. */
const LUXON_WEEKDAY_TO_RRULE: Record<number, Weekday> = {
  1: RRule.MO,
  2: RRule.TU,
  3: RRule.WE,
  4: RRule.TH,
  5: RRule.FR,
  6: RRule.SA,
  7: RRule.SU,
};

const WEEKDAY_RRULE = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];

interface Ymd {
  y: number;
  m: number;
  d: number;
}

/**
 * Expands a schedule's events into concrete, priority-resolved playback windows
 * for a screen's timezone, and resolves what plays at a given instant.
 *
 * Stateless and DB-free so it can be unit-tested exhaustively and reused by a
 * future device-sync worker. Timezone strategy mirrors `AvailabilityEvaluator`:
 * rrule enumerates which *local calendar days* a window anchors on (naive/UTC
 * space); luxon then converts each `(localDay, 'HH:mm')` into an absolute instant
 * in the screen's timezone, keeping DST correct without fighting rrule.
 */
@Injectable()
export class ScheduleEvaluator {
  /**
   * Concrete, non-overlapping playback windows over `[rangeStart, rangeEnd]`,
   * with overlaps resolved by `order` (lower wins — the sidebar list order).
   */
  getWindows(
    events: EvaluableEvent[],
    timezone: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): ResolvedWindow[] {
    const raw: Array<{ start: Date; end: Date; event: EvaluableEvent }> = [];
    for (const event of events) {
      for (const window of this.eventWindows(
        event,
        timezone,
        rangeStart,
        rangeEnd,
      )) {
        raw.push({ ...window, event });
      }
    }
    if (raw.length === 0) {
      return [];
    }

    // Sweep line: split the timeline at every window boundary, then assign each
    // elementary segment to the covering event with the lowest `order`.
    const points = [
      ...new Set(raw.flatMap((w) => [w.start.getTime(), w.end.getTime()])),
    ].sort((a, b) => a - b);

    const segments: ResolvedWindow[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      if (b <= a) {
        continue;
      }
      const mid = a + (b - a) / 2;
      const covering = raw.filter(
        (w) => w.start.getTime() <= mid && mid < w.end.getTime(),
      );
      if (covering.length === 0) {
        continue;
      }
      const winner = covering.reduce((best, w) =>
        w.event.order < best.event.order ? w : best,
      );
      segments.push(this.toResolvedWindow(winner.event, new Date(a), new Date(b)));
    }

    return this.coalesce(segments);
  }

  /** What plays at `instant`: a content/off event window, else filler, else off. */
  resolveAt(
    events: EvaluableEvent[],
    filler: EvaluableFiller | undefined,
    timezone: string,
    instant: Date,
  ): ScheduleResolution {
    // An active window can have started up to ~24h earlier (overnight), so pad
    // both sides of the probe range.
    const windows = this.getWindows(
      events,
      timezone,
      new Date(instant.getTime() - MS_PER_DAY),
      new Date(instant.getTime() + MS_PER_DAY),
    );
    const active = windows.find(
      (w) => w.start <= instant && instant < w.end,
    );

    if (active) {
      if (active.type === ScheduleEventType.SCREEN_OFF) {
        return {
          state: 'off',
          eventId: active.eventId,
          window: { start: active.start, end: active.end },
        };
      }
      return {
        state: 'content',
        eventId: active.eventId,
        contentType: active.contentType,
        mediaId: active.mediaId,
        playlistId: active.playlistId,
        fit: active.fit,
        window: { start: active.start, end: active.end },
      };
    }

    if (filler) {
      return {
        state: 'filler',
        contentType: filler.contentType,
        mediaId: filler.mediaId,
        playlistId: filler.playlistId,
        fit: filler.fit,
      };
    }
    return { state: 'off' };
  }

  /** Raw (pre-priority) windows for a single event, clipped to the range. */
  private eventWindows(
    event: EvaluableEvent,
    timezone: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Array<{ start: Date; end: Date }> {
    if (event.repeat === ScheduleRepeat.NONE) {
      return this.singleWindow(event, timezone, rangeStart, rangeEnd);
    }
    return this.recurringWindows(event, timezone, rangeStart, rangeEnd);
  }

  /** A non-repeating event is one continuous block across its start/end dates. */
  private singleWindow(
    event: EvaluableEvent,
    timezone: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Array<{ start: Date; end: Date }> {
    const startYmd = this.parseDate(event.startDate);
    const endYmd = this.parseDate(event.endDate);
    const startMin = this.parseMinutes(event.startTime);
    const endMin = this.parseMinutes(event.endTime);
    if (!startYmd || !endYmd || startMin === null || endMin === null) {
      return [];
    }

    const start = this.localWallClock(timezone, startYmd, startMin);
    const end = this.localWallClock(timezone, endYmd, endMin);
    if (!start || !end || end <= start) {
      return [];
    }
    return this.clip({ start, end }, rangeStart, rangeEnd);
  }

  private recurringWindows(
    event: EvaluableEvent,
    timezone: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Array<{ start: Date; end: Date }> {
    const eventFrom = this.parseDate(event.startDate);
    const eventTo = this.parseDate(event.endDate);
    const startMin = this.parseMinutes(event.startTime);
    const endMin = this.parseMinutes(event.endTime);
    if (!eventFrom || !eventTo || startMin === null || endMin === null) {
      return [];
    }
    const overnight = endMin <= startMin;
    const excluded = new Set(event.excludedDates);

    // Intersect the event's own [startDate, endDate] with the query range
    // (padded ±1 day so overnight windows anchored just outside are caught).
    const rangeFrom = DateTime.fromJSDate(rangeStart, { zone: timezone })
      .startOf('day')
      .minus({ days: 1 });
    const rangeTo = DateTime.fromJSDate(rangeEnd, { zone: timezone })
      .startOf('day')
      .plus({ days: 1 });
    const dtFrom = this.maxYmd(eventFrom, this.toYmd(rangeFrom));
    const dtUntil = this.minYmd(eventTo, this.toYmd(rangeTo));
    if (this.compareYmd(dtFrom, dtUntil) > 0) {
      return [];
    }

    const rule = new RRule({
      ...this.repeatOptions(event.repeat, eventFrom),
      dtstart: this.naiveUtc(dtFrom),
      until: this.naiveUtc(dtUntil),
    });

    const windows: Array<{ start: Date; end: Date }> = [];
    for (const occurrence of rule.all()) {
      const day: Ymd = {
        y: occurrence.getUTCFullYear(),
        m: occurrence.getUTCMonth() + 1,
        d: occurrence.getUTCDate(),
      };
      const localDate = this.formatYmd(day);
      if (excluded.has(localDate)) {
        continue;
      }
      const window = this.buildWindow(timezone, day, startMin, endMin, overnight);
      if (window) {
        windows.push(...this.clip(window, rangeStart, rangeEnd));
      }
    }
    return windows;
  }

  private repeatOptions(
    repeat: ScheduleRepeat,
    anchor: Ymd,
  ): Partial<ConstructorParameters<typeof RRule>[0]> {
    switch (repeat) {
      case ScheduleRepeat.DAILY:
        return { freq: RRule.DAILY };
      case ScheduleRepeat.WEEKDAYS:
        return { freq: RRule.WEEKLY, byweekday: WEEKDAY_RRULE };
      case ScheduleRepeat.WEEKLY:
        return {
          freq: RRule.WEEKLY,
          byweekday: [this.rruleWeekday(anchor)],
        };
      case ScheduleRepeat.MONTHLY:
        return { freq: RRule.MONTHLY, bymonthday: [anchor.d] };
      case ScheduleRepeat.YEARLY:
        return {
          freq: RRule.YEARLY,
          bymonth: [anchor.m],
          bymonthday: [anchor.d],
        };
      default:
        return { freq: RRule.DAILY };
    }
  }

  /**
   * Builds an absolute window from a local day + 'HH:mm' start/end. Overnight
   * windows (`overnight === true`) end on the following local day. Both endpoints
   * are DST-aware; a time that does not exist on a spring-forward day is rejected
   * rather than silently shifted.
   */
  private buildWindow(
    timezone: string,
    day: Ymd,
    startMin: number,
    endMin: number,
    overnight: boolean,
  ): { start: Date; end: Date } | null {
    const start = this.localWallClock(timezone, day, startMin);
    if (!start) {
      return null;
    }
    const endDay = overnight
      ? this.toYmd(
          DateTime.fromJSDate(start, { zone: timezone })
            .startOf('day')
            .plus({ days: 1 }),
        )
      : day;
    const end = this.localWallClock(timezone, endDay, endMin);
    if (!end || end <= start) {
      return null;
    }
    return { start, end };
  }

  private localWallClock(
    timezone: string,
    day: Ymd,
    minuteOfDay: number,
  ): Date | null {
    const dt = DateTime.fromObject(
      {
        year: day.y,
        month: day.m,
        day: day.d,
        hour: Math.floor(minuteOfDay / 60),
        minute: minuteOfDay % 60,
      },
      { zone: timezone },
    );
    if (!dt.isValid) {
      return null;
    }
    // luxon maps a non-existent local time (spring-forward gap) to a different
    // wall-clock; detect that and reject instead of silently shifting.
    if (dt.hour * 60 + dt.minute !== minuteOfDay) {
      return null;
    }
    return dt.toJSDate();
  }

  private clip(
    window: { start: Date; end: Date },
    rangeStart: Date,
    rangeEnd: Date,
  ): Array<{ start: Date; end: Date }> {
    const start = window.start > rangeStart ? window.start : rangeStart;
    const end = window.end < rangeEnd ? window.end : rangeEnd;
    return end > start ? [{ start, end }] : [];
  }

  /** Merge consecutive segments that resolve to the same event. */
  private coalesce(segments: ResolvedWindow[]): ResolvedWindow[] {
    const merged: ResolvedWindow[] = [];
    for (const segment of segments) {
      const last = merged[merged.length - 1];
      if (
        last &&
        last.eventId === segment.eventId &&
        last.end.getTime() === segment.start.getTime()
      ) {
        last.end = segment.end;
      } else {
        merged.push({ ...segment });
      }
    }
    return merged;
  }

  private toResolvedWindow(
    event: EvaluableEvent,
    start: Date,
    end: Date,
  ): ResolvedWindow {
    return {
      start,
      end,
      eventId: event.id,
      type: event.type,
      contentType: event.contentType,
      mediaId: event.mediaId,
      playlistId: event.playlistId,
      fit: event.fit,
      order: event.order,
    };
  }

  private rruleWeekday(day: Ymd): Weekday {
    const weekday = DateTime.fromObject({
      year: day.y,
      month: day.m,
      day: day.d,
    }).weekday;
    return LUXON_WEEKDAY_TO_RRULE[weekday];
  }

  private naiveUtc(day: Ymd): Date {
    return new Date(Date.UTC(day.y, day.m - 1, day.d));
  }

  private toYmd(dt: DateTime): Ymd {
    return { y: dt.year, m: dt.month, d: dt.day };
  }

  private formatYmd(day: Ymd): string {
    const m = String(day.m).padStart(2, '0');
    const d = String(day.d).padStart(2, '0');
    return `${day.y}-${m}-${d}`;
  }

  private compareYmd(a: Ymd, b: Ymd): number {
    return Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d);
  }

  private maxYmd(a: Ymd, b: Ymd): Ymd {
    return this.compareYmd(a, b) >= 0 ? a : b;
  }

  private minYmd(a: Ymd, b: Ymd): Ymd {
    return this.compareYmd(a, b) <= 0 ? a : b;
  }

  private parseMinutes(value: string): number | null {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (!match) {
      return null;
    }
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private parseDate(value: string): Ymd | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }
    const day = { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
    const dt = DateTime.fromObject({ year: day.y, month: day.m, day: day.d });
    return dt.isValid ? day : null;
  }
}
