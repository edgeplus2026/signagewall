import { ScheduleEvaluator, EvaluableEvent, EvaluableFiller } from './schedule.evaluator';
import {
  ScheduleContentType,
  ScheduleEventType,
  ScheduleFit,
  ScheduleRepeat,
} from './schemas/schedule.schema';

const TZ = 'Europe/Belgrade'; // CET (UTC+1) winter, CEST (UTC+2) summer
const utc = (iso: string) => new Date(iso);

function contentEvent(overrides: Partial<EvaluableEvent> = {}): EvaluableEvent {
  return {
    id: 'e1',
    type: ScheduleEventType.CONTENT,
    contentType: ScheduleContentType.PLAYLIST,
    playlistId: 'p1',
    fit: ScheduleFit.FIT,
    repeat: ScheduleRepeat.NONE,
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    startTime: '09:00',
    endTime: '17:00',
    excludedDates: [],
    order: 0,
    ...overrides,
  };
}

const filler: EvaluableFiller = {
  contentType: ScheduleContentType.MEDIA,
  mediaId: 'fillerMedia',
  fit: ScheduleFit.FIT,
};

describe('ScheduleEvaluator', () => {
  const evaluator = new ScheduleEvaluator();

  describe('non-repeating (single) events', () => {
    it('resolves content inside the window and off/filler outside it', () => {
      const events = [contentEvent()];
      // 2026-06-01 summer (UTC+2): 09:00–17:00 local = 07:00Z–15:00Z.
      const inside = evaluator.resolveAt(events, undefined, TZ, utc('2026-06-01T08:00:00Z'));
      expect(inside.state).toBe('content');
      expect(inside.playlistId).toBe('p1');

      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-01T06:00:00Z')).state).toBe(
        'off',
      );
      const withFiller = evaluator.resolveAt(events, filler, TZ, utc('2026-06-01T06:00:00Z'));
      expect(withFiller.state).toBe('filler');
      expect(withFiller.mediaId).toBe('fillerMedia');
    });

    it('spans multiple days as one continuous block', () => {
      const events = [contentEvent({ startDate: '2026-06-01', endDate: '2026-06-03' })];
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-02T12:00:00Z')).state).toBe(
        'content',
      );
    });
  });

  describe('recurrence', () => {
    it('repeats weekly on the start weekday', () => {
      const events = [
        contentEvent({ repeat: ScheduleRepeat.WEEKLY, endDate: '2026-12-31' }),
      ];
      // 2026-06-01 is a Monday; 2026-06-08 is the next Monday.
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-08T08:00:00Z')).state).toBe(
        'content',
      );
      // Tuesday is off.
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-09T08:00:00Z')).state).toBe(
        'off',
      );
    });

    it('repeats every weekday (Mon–Fri) but not weekends', () => {
      const events = [
        contentEvent({ repeat: ScheduleRepeat.WEEKDAYS, endDate: '2026-06-30' }),
      ];
      // 2026-06-05 Friday on, 2026-06-06 Saturday off.
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-05T08:00:00Z')).state).toBe(
        'content',
      );
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-06T08:00:00Z')).state).toBe(
        'off',
      );
    });

    it('skips excluded occurrence dates', () => {
      const events = [
        contentEvent({
          repeat: ScheduleRepeat.WEEKDAYS,
          endDate: '2026-06-30',
          excludedDates: ['2026-06-03'], // a Wednesday
        }),
      ];
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-03T08:00:00Z')).state).toBe(
        'off',
      );
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-02T08:00:00Z')).state).toBe(
        'content',
      );
    });

    it('supports overnight windows that cross midnight', () => {
      const events = [
        contentEvent({
          repeat: ScheduleRepeat.DAILY,
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          startTime: '22:00',
          endTime: '02:00',
        }),
      ];
      // Summer: 22:00 local = 20:00Z; window runs to 02:00 local next day = 00:00Z.
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-01T21:00:00Z')).state).toBe(
        'content',
      );
      // 18:00Z = 20:00 local, before the window opens.
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-01T18:00:00Z')).state).toBe(
        'off',
      );
      // 01:00Z next day = 03:00 local, after the window closes.
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-06-02T01:00:00Z')).state).toBe(
        'off',
      );
    });
  });

  describe('overlap precedence', () => {
    it('lets the lower-order event win an overlap', () => {
      const a = contentEvent({ id: 'a', playlistId: 'pa', order: 0 });
      const b = contentEvent({ id: 'b', playlistId: 'pb', order: 1 });
      const at = utc('2026-06-01T08:00:00Z');
      expect(evaluator.resolveAt([a, b], undefined, TZ, at).playlistId).toBe('pa');
      // Reverse priority → other event wins.
      expect(
        evaluator.resolveAt(
          [{ ...a, order: 1 }, { ...b, order: 0 }],
          undefined,
          TZ,
          at,
        ).playlistId,
      ).toBe('pb');
    });

    it('turns the screen off when a screen_off event has priority', () => {
      const content = contentEvent({ id: 'c', order: 1 });
      const off = contentEvent({
        id: 'off',
        type: ScheduleEventType.SCREEN_OFF,
        contentType: undefined,
        playlistId: undefined,
        fit: undefined,
        order: 0,
      });
      expect(evaluator.resolveAt([content, off], filler, TZ, utc('2026-06-01T08:00:00Z')).state).toBe(
        'off',
      );
      // Lower-priority screen_off loses to content.
      expect(
        evaluator.resolveAt(
          [{ ...content, order: 0 }, { ...off, order: 1 }],
          filler,
          TZ,
          utc('2026-06-01T08:00:00Z'),
        ).state,
      ).toBe('content');
    });
  });

  describe('timezone handling', () => {
    it('rejects a window whose local start falls in a DST spring-forward gap', () => {
      // Europe/Belgrade 2026-03-29: 02:00→03:00 gap, so 02:30 does not exist.
      const events = [
        contentEvent({ startDate: '2026-03-29', endDate: '2026-03-29', startTime: '02:30', endTime: '04:00' }),
      ];
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-03-29T02:00:00Z')).state).toBe(
        'off',
      );
    });

    it('resolves the same wall-clock event differently per timezone', () => {
      const events = [contentEvent()]; // 09:00–17:00 local, 2026-06-01.
      const at = utc('2026-06-01T08:00:00Z');
      // Belgrade summer: 08:00Z = 10:00 local → inside the window.
      expect(evaluator.resolveAt(events, undefined, TZ, at).state).toBe('content');
      // UTC: 08:00 is before 09:00 → outside the window.
      expect(evaluator.resolveAt(events, undefined, 'UTC', at).state).toBe('off');
    });

    it('preserves wall-clock time across DST (winter offset differs from summer)', () => {
      // Anchor on a Monday in January so the weekly series covers the winter date.
      const events = [
        contentEvent({ repeat: ScheduleRepeat.WEEKLY, startDate: '2026-01-05', endDate: '2026-12-31' }),
      ];
      // Winter Monday 2026-01-05 (UTC+1): 09:30 local = 08:30Z.
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-01-05T08:30:00Z')).state).toBe(
        'content',
      );
      expect(evaluator.resolveAt(events, undefined, TZ, utc('2026-01-05T07:30:00Z')).state).toBe(
        'off',
      );
    });
  });

  describe('getWindows', () => {
    it('returns priority-resolved, non-overlapping windows over a range', () => {
      const a = contentEvent({ id: 'a', playlistId: 'pa', order: 0, startTime: '09:00', endTime: '12:00' });
      const b = contentEvent({ id: 'b', playlistId: 'pb', order: 1, startTime: '10:00', endTime: '14:00' });
      const windows = evaluator.getWindows(
        [a, b],
        TZ,
        utc('2026-06-01T00:00:00Z'),
        utc('2026-06-02T00:00:00Z'),
      );
      // a (09–12) wins its overlap with b; b shows 12–14. No overlapping segments.
      expect(windows.map((w) => w.eventId)).toEqual(['a', 'b']);
      for (let i = 1; i < windows.length; i += 1) {
        expect(windows[i].start.getTime()).toBeGreaterThanOrEqual(windows[i - 1].end.getTime());
      }
    });

    it('returns nothing for an empty schedule', () => {
      expect(
        evaluator.getWindows([], TZ, utc('2026-06-01T00:00:00Z'), utc('2026-06-08T00:00:00Z')),
      ).toEqual([]);
    });
  });
});
