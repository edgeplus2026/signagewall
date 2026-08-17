import { localParts, periodFor } from './report-schedule.service';
import { ReportFrequency } from './schemas/report-schedule.schema';

describe('scheduled report periods', () => {
  it('reports yesterday, never today', () => {
    // Today is still running. A daily report of a half-finished day would show
    // a coverage number that is wrong by however much of the day is left.
    expect(periodFor(ReportFrequency.DAILY, '2026-08-17')).toEqual({
      key: '2026-08-16',
      from: '2026-08-16',
      to: '2026-08-16',
    });
  });

  it('reports the week that has ended', () => {
    // 2026-08-17 is a Monday, so the closed week is the one before it.
    expect(periodFor(ReportFrequency.WEEKLY, '2026-08-17')).toEqual({
      key: '2026-08-10',
      from: '2026-08-10',
      to: '2026-08-16',
    });
  });

  it('keeps the same week all week, so it is sent once', () => {
    const monday = periodFor(ReportFrequency.WEEKLY, '2026-08-17');
    const thursday = periodFor(ReportFrequency.WEEKLY, '2026-08-20');
    const sunday = periodFor(ReportFrequency.WEEKLY, '2026-08-23');

    // The period key is what stops a second send: if it drifted during the week,
    // a restart on Thursday would post the same report again.
    expect(thursday).toEqual(monday);
    expect(sunday).toEqual(monday);
  });

  it('reports the month that has ended', () => {
    expect(periodFor(ReportFrequency.MONTHLY, '2026-08-03')).toEqual({
      key: '2026-07',
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('handles the turn of the year', () => {
    expect(periodFor(ReportFrequency.MONTHLY, '2027-01-01')).toEqual({
      key: '2026-12',
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });

  it('refuses a date it cannot read rather than inventing a period', () => {
    expect(periodFor(ReportFrequency.DAILY, 'not-a-day')).toBeNull();
  });
});

describe('local send time', () => {
  it('reads the hour in the customer’s own timezone', () => {
    // 05:30 UTC in mid-August is 07:30 in Belgrade — a 07:00 schedule is due.
    const at = new Date('2026-08-17T05:30:00.000Z');
    expect(localParts(at, 'Europe/Belgrade')).toEqual({
      day: '2026-08-17',
      hour: 7,
    });
  });

  it('crosses the date line where the customer is, not where the server is', () => {
    const at = new Date('2026-08-17T22:30:00.000Z');
    // Still the 17th in UTC, already the 18th in Auckland.
    expect(localParts(at, 'Pacific/Auckland').day).toBe('2026-08-18');
  });

  it('falls back to UTC rather than losing every other customer’s report', () => {
    const at = new Date('2026-08-17T05:30:00.000Z');
    expect(localParts(at, 'Not/AZone')).toEqual({
      day: '2026-08-17',
      hour: 5,
    });
  });
});
