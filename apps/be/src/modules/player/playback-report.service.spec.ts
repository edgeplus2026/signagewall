import { Types } from 'mongoose';

import type { AppInstancesRepository } from '../apps/app-instances.repository';
import type { MediaRepository } from '../media/media.repository';
import type { ScreensRepository } from '../screens/screens.repository';
import { PlaybackReportService } from './playback-report.service';
import type { PlayerContentService } from './player-content.service';
import type { PlaybackDayRow, PlaybackRepository } from './playback.repository';

const ORG = new Types.ObjectId().toString();
const SCREEN = new Types.ObjectId();
/** 2026-08-17 is a Monday. */
const DAY = '2026-08-17';

/** Nine-to-five, Monday only — everything else closed. */
const NINE_TO_FIVE = {
  mode: 'weekly',
  timezone: 'Europe/Belgrade',
  weekly: [
    { day: 'monday', enabled: true, start: '09:00', end: '17:00' },
    { day: 'tuesday', enabled: false, start: '09:00', end: '17:00' },
  ],
};

/** A row for one item, with airtime placed in the given hours. */
function row(
  contentId: string,
  hours: Record<number, { ms: number; plays: number }>,
  overrides: Partial<PlaybackDayRow> = {},
): PlaybackDayRow {
  const airtime: Record<string, number> = {};
  const plays: Record<string, number> = {};
  let totalMs = 0;
  let totalPlays = 0;
  for (const [hour, value] of Object.entries(hours)) {
    airtime[hour] = value.ms;
    plays[hour] = value.plays;
    totalMs += value.ms;
    totalPlays += value.plays;
  }
  return {
    screenId: SCREEN,
    contentId,
    kind: 'image',
    plays: totalPlays,
    airtimeMs: totalMs,
    hours: plays,
    airtime,
    ...overrides,
  };
}

/** A full hour of ordinary rotation: several items, many plays. */
function busyHour(hour: number): PlaybackDayRow[] {
  return [
    row(`media-a-${String(hour)}`, { [hour]: { ms: 1_800_000, plays: 60 } }),
    row(`media-b-${String(hour)}`, { [hour]: { ms: 1_800_000, plays: 60 } }),
  ];
}

function buildService(options: {
  rows?: PlaybackDayRow[];
  availability?: unknown;
  screens?: { _id: Types.ObjectId; name: string; availability?: unknown }[];
  items?: {
    items: unknown[];
    totals: { plays: number; airtimeMs: number };
  };
  snapshot?: {
    items: { id: string; contentId?: string; durationMs: number }[];
  };
}) {
  const findDay = jest.fn().mockResolvedValue(options.rows ?? []);
  const aggregateItems = jest
    .fn()
    .mockResolvedValue(
      options.items ?? { items: [], totals: { plays: 0, airtimeMs: 0 } },
    );
  const findAllSummariesByOrganization = jest
    .fn()
    .mockResolvedValue(
      options.screens ?? [
        { _id: SCREEN, name: 'Lobby', availability: options.availability },
      ],
    );
  const findSummariesByIds = jest
    .fn()
    .mockResolvedValue([{ _id: SCREEN, name: 'Lobby' }]);
  const findByIds = jest.fn().mockResolvedValue([]);
  const aggregateHours = jest
    .fn()
    .mockResolvedValue({ plays: [], airtimeMs: [] });
  const resolveByScreenId = jest
    .fn()
    .mockResolvedValue(options.snapshot ?? null);

  return {
    service: new PlaybackReportService(
      {
        findDay,
        aggregateItems,
        aggregateHours,
      } as unknown as PlaybackRepository,
      {
        findAllSummariesByOrganization,
        findSummariesByIds,
      } as unknown as ScreensRepository,
      { findByIds } as unknown as MediaRepository,
      { findByIds } as unknown as AppInstancesRepository,
      { resolveByScreenId } as unknown as PlayerContentService,
    ),
    findDay,
    aggregateItems,
    aggregateHours,
    findByIds,
    resolveByScreenId,
  };
}

describe('PlaybackReportService: coverage', () => {
  it('counts only the hours the screen was expected to be on', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      rows: [9, 10, 11, 12, 13, 14, 15, 16].flatMap((hour) => busyHour(hour)),
    });

    const report = await service.coverage(ORG, DAY);

    expect(report.coverage).toBe(100);
    // Overnight is not a gap — it is the availability rule working. Colouring it
    // as one would bury every real gap under every night of every week.
    expect(report.screens[0]?.cells[3]?.state).toBe('idle');
    expect(report.screens[0]?.cells[9]?.state).toBe('covered');
    expect(report.exceptions).toHaveLength(0);
  });

  it('treats a screen with no rule as expected to be on all day', async () => {
    const { service } = buildService({ rows: [] });
    const report = await service.coverage(ORG, DAY);

    expect(report.coverage).toBe(0);
    expect(report.screens[0]?.cells.every((c) => c.state === 'off')).toBe(true);
  });

  it('reports nothing to answer when the day is closed', async () => {
    const { service } = buildService({
      availability: {
        ...NINE_TO_FIVE,
        weekly: [
          { day: 'monday', enabled: false, start: '09:00', end: '17:00' },
        ],
      },
    });

    const report = await service.coverage(ORG, DAY);

    // A closed screen is not 0% covered, it is not measurable — and showing it
    // as 0% would put a red number against a screen that did nothing wrong.
    expect(report.coverage).toBeNull();
    expect(report.screens[0]?.coverage).toBeNull();
  });

  it('collapses lost hours into one exception with its duration', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      rows: [9, 10, 11, 12, 13, 16].flatMap((hour) => busyHour(hour)),
    });

    const report = await service.coverage(ORG, DAY);

    expect(report.exceptions).toHaveLength(1);
    expect(report.exceptions[0]).toMatchObject({
      kind: 'off',
      screenName: 'Lobby',
      fromHour: 14,
      toHour: 16,
      durationMs: 2 * 60 * 60 * 1000,
    });
    expect(report.coverage).toBe(75);
  });

  it('sees a screen frozen on one item, which the totals cannot', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      rows: [
        ...busyHour(9),
        ...busyHour(10),
        // From 11:00 the rotation stopped turning: one item, one play, filling
        // hour after hour. A table of totals shows this as a big airtime number
        // and reads like good news.
        row('media-stuck', {
          11: { ms: 3_600_000, plays: 1 },
          12: { ms: 3_600_000, plays: 0 },
          13: { ms: 3_600_000, plays: 0 },
        }),
        ...busyHour(14),
        ...busyHour(15),
        ...busyHour(16),
      ],
    });

    const report = await service.coverage(ORG, DAY);

    expect(report.screens[0]?.cells[12]?.state).toBe('stuck');
    expect(report.exceptions).toHaveLength(1);
    expect(report.exceptions[0]).toMatchObject({
      kind: 'stuck',
      fromHour: 11,
      toHour: 14,
      // Named, so the operator can tell a fault from their own single-item screen.
      itemName: 'media-stuck',
    });
    // Airtime alone would call this a perfect day.
    expect(report.coverage).toBe(100);
  });

  it('does not call an ordinary busy hour stuck', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      rows: [9].flatMap((hour) => busyHour(hour)),
    });

    const report = await service.coverage(ORG, DAY);
    expect(report.screens[0]?.cells[9]?.state).toBe('covered');
  });

  it('steps a partly-covered hour down the ramp', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      // A quarter of the hour had content: several items, so not "stuck".
      rows: [
        row('media-a', { 9: { ms: 450_000, plays: 15 } }),
        row('media-b', { 9: { ms: 450_000, plays: 15 } }),
      ],
    });

    const report = await service.coverage(ORG, DAY);
    expect(report.screens[0]?.cells[9]).toMatchObject({
      state: 'covered',
      level: 1,
    });
  });

  it('puts the longest outage first', async () => {
    const second = new Types.ObjectId();
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      screens: [
        { _id: SCREEN, name: 'Lobby', availability: NINE_TO_FIVE },
        { _id: second, name: 'Izlog', availability: NINE_TO_FIVE },
      ],
      rows: [
        // Lobby lost one hour; Izlog lost four.
        ...[9, 10, 11, 12, 13, 14, 15].flatMap((hour) => busyHour(hour)),
        ...[9, 10, 11, 12].flatMap((hour) =>
          busyHour(hour).map((r) => ({ ...r, screenId: second })),
        ),
      ],
    });

    const report = await service.coverage(ORG, DAY);

    expect(report.exceptions[0]?.screenName).toBe('Izlog');
    expect(report.exceptions[0]?.durationMs).toBe(4 * 60 * 60 * 1000);
    expect(report.exceptions[1]?.screenName).toBe('Lobby');
  });

  it('covers only the minutes a partial window actually asked for', async () => {
    const { service } = buildService({
      availability: {
        mode: 'weekly',
        timezone: 'Europe/Belgrade',
        weekly: [
          { day: 'monday', enabled: true, start: '09:30', end: '10:00' },
        ],
      },
      rows: [
        row('media-a', { 9: { ms: 1_800_000, plays: 30 } }),
        row('media-b', { 9: { ms: 1, plays: 1 } }),
      ],
    });

    const report = await service.coverage(ORG, DAY);
    // Half an hour expected, half an hour delivered.
    expect(report.screens[0]?.cells[9]?.expectedMs).toBe(1_800_000);
    expect(report.coverage).toBe(100);
  });
});

describe('PlaybackReportService: items', () => {
  it('names each item and works out its share', async () => {
    const contentId = new Types.ObjectId();
    const { service, findByIds } = buildService({
      items: {
        items: [
          {
            _id: contentId.toString(),
            plays: 120,
            airtimeMs: 1_800_000,
            screenIds: [SCREEN],
            kind: 'image',
            firstAt: new Date('2026-08-17T07:00:00Z'),
            lastAt: new Date('2026-08-17T19:00:00Z'),
          },
        ],
        totals: { plays: 240, airtimeMs: 3_600_000 },
      },
    });
    findByIds.mockResolvedValue([{ _id: contentId, name: 'Letnja akcija' }]);

    const report = await service.items(ORG, '2026-08-01', '2026-08-17');

    expect(report.items[0]).toMatchObject({
      name: 'Letnja akcija',
      plays: 120,
      share: 50,
      screens: 1,
      screenNames: ['Lobby'],
    });
  });

  it('still reports an item that has since been deleted', async () => {
    const contentId = new Types.ObjectId().toString();
    const { service } = buildService({
      items: {
        items: [
          {
            _id: contentId,
            plays: 5,
            airtimeMs: 1000,
            screenIds: [],
            kind: 'image',
          },
        ],
        totals: { plays: 5, airtimeMs: 1000 },
      },
    });

    const report = await service.items(ORG, '2026-08-01', '2026-08-17');

    // A campaign is usually reported after it ended, which is exactly when its
    // media is most likely to have been tidied away.
    expect(report.items[0]?.name).toBe(contentId);
  });
});

describe('PlaybackReportService: focusing on one item', () => {
  it('draws only the focused item, and calls a quiet hour quiet — not an outage', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      rows: [
        row('mine', { 9: { ms: 900_000, plays: 30 } }),
        row('theirs', { 10: { ms: 3_600_000, plays: 60 } }),
      ],
    });

    const report = await service.coverage(ORG, DAY, { contentId: 'mine' });

    expect(report.focus).toMatchObject({ kind: 'item', id: 'mine' });
    expect(report.screens[0]?.cells[9]?.state).toBe('covered');
    // Hour 10 ran content — just not this spot. Painting that red would make
    // every focused view a wall of alarm.
    expect(report.screens[0]?.cells[10]?.state).toBe('quiet');
    expect(report.screens[0]?.cells[3]?.state).toBe('idle');
    expect(report.exceptions).toHaveLength(0);
  });
});

describe('PlaybackReportService: planned against played', () => {
  it('works out how many turns the rotation had time for', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      // Two items of 15s each: a 30s loop, eight expected hours ⇒ 960 turns.
      snapshot: {
        items: [
          { id: 's1', contentId: 'a', durationMs: 15_000 },
          { id: 's2', contentId: 'b', durationMs: 15_000 },
        ],
      },
      rows: [
        row('a', { 9: { ms: 1, plays: 960 } }),
        row('b', { 9: { ms: 1, plays: 500 } }),
      ],
    });

    const report = await service.plan(ORG, DAY);

    expect(report.basis).toBe('current-rotation');
    // Worst shortfall first: the item that was skipped is the answer.
    expect(report.rows[0]).toMatchObject({
      contentId: 'b',
      plannedPlays: 960,
      actualPlays: 500,
      delta: -460,
    });
    expect(report.rows[1]).toMatchObject({ contentId: 'a', delta: 0 });
  });

  it('says nothing about a screen that was not expected to be on', async () => {
    const { service, resolveByScreenId } = buildService({
      availability: {
        mode: 'weekly',
        timezone: 'Europe/Belgrade',
        weekly: [
          { day: 'monday', enabled: false, start: '09:00', end: '17:00' },
        ],
      },
      snapshot: { items: [{ id: 's1', contentId: 'a', durationMs: 15_000 }] },
    });

    const report = await service.plan(ORG, DAY);

    expect(report.rows).toHaveLength(0);
    // And it did not even go and resolve the rotation to find that out.
    expect(resolveByScreenId).not.toHaveBeenCalled();
  });

  it('says nothing when the screen has no rotation to plan against', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      snapshot: { items: [] },
    });

    const report = await service.plan(ORG, DAY);
    expect(report.rows).toHaveLength(0);
  });
});

describe('PlaybackReportService: emergency takeover', () => {
  it('draws a takeover as itself, not as content and not as an outage', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      rows: [
        ...busyHour(9),
        // 10:00–12:00 an evacuation notice held the screen.
        row(
          'alert-1',
          {
            10: { ms: 3_600_000, plays: 1 },
            11: { ms: 3_600_000, plays: 0 },
          },
          { kind: 'app', slug: 'alert' },
        ),
        ...busyHour(12),
      ],
    });

    const report = await service.coverage(ORG, DAY);

    expect(report.screens[0]?.cells[10]?.state).toBe('takeover');
    expect(report.screens[0]?.cells[11]?.state).toBe('takeover');
    // Not 'stuck': the rotation did not freeze, it was deliberately replaced.
    expect(report.screens[0]?.cells[9]?.state).toBe('covered');
  });

  it('explains the gap in the exception list', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      rows: [
        row(
          'alert-1',
          {
            14: { ms: 3_600_000, plays: 1 },
            15: { ms: 3_600_000, plays: 0 },
          },
          { kind: 'app', slug: 'alert' },
        ),
        ...[9, 10, 11, 12, 13, 16].flatMap((hour) => busyHour(hour)),
      ],
    });

    const report = await service.coverage(ORG, DAY);

    // "Why did my spot not run on Tuesday afternoon" has to have an answer.
    expect(report.exceptions).toHaveLength(1);
    expect(report.exceptions[0]).toMatchObject({
      kind: 'takeover',
      fromHour: 14,
      toHour: 16,
    });
  });

  it('leaves an hour the alert only clipped described by the rest of it', async () => {
    const { service } = buildService({
      availability: NINE_TO_FIVE,
      rows: [
        ...busyHour(9),
        // Ten minutes of alert against fifty of ordinary rotation.
        row(
          'alert-1',
          { 9: { ms: 600_000, plays: 1 } },
          {
            kind: 'app',
            slug: 'alert',
          },
        ),
      ],
    });

    const report = await service.coverage(ORG, DAY);
    expect(report.screens[0]?.cells[9]?.state).toBe('covered');
  });
});

describe('PlaybackReportService: dayparting', () => {
  it('narrows to the focused item', async () => {
    const { service, aggregateHours } = buildService({});

    await service.dayparting(ORG, '2026-08-01', '2026-08-17', {
      contentId: 'media-1',
    });

    expect(aggregateHours).toHaveBeenCalledWith(
      ORG,
      '2026-08-01',
      '2026-08-17',
      {
        contentIds: ['media-1'],
      },
    );
  });
});
