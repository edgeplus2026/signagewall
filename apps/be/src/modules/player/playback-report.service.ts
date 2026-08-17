import { Injectable } from '@nestjs/common';
import { APP_MANIFESTS } from '@signagewall/apps';
import { Types } from 'mongoose';

import { AppInstancesRepository } from '../apps/app-instances.repository';
import { CampaignsRepository } from '../campaigns/campaigns.repository';
import { MediaRepository } from '../media/media.repository';
import { ScreensRepository } from '../screens/screens.repository';
import { PlayerContentService } from './player-content.service';
import {
  PLAYBACK_ITEM_LIMIT,
  PlaybackDayRow,
  PlaybackRepository,
} from './playback.repository';

/**
 * Turns the buckets into the two things an operator actually asks for.
 *
 * The report is deliberately NOT a chart of plays per item. A rotation is a
 * loop, so every item in it plays the same number of times — a bar chart of that
 * is four bars of equal length, and it measures the operator's own configuration
 * rather than what the screen did. What varies, and what somebody pays to know,
 * is whether the screen was showing anything at all: hours lost to a dead link,
 * a clip that never loaded, a rotation frozen on one slide.
 *
 * So the headline is COVERAGE — how much of the expected time actually had
 * content — and the detail is a table. See the design document.
 */

const HOURS_IN_DAY = 24;

/**
 * Screens in one coverage matrix.
 *
 * The matrix is read by eye, and past a couple of hundred rows there is nothing
 * to see. The cut is reported rather than silent.
 */
const MAX_MATRIX_SCREENS = 200;

/**
 * Screens in one planned-against-played report.
 *
 * Far lower than the matrix, and for a different reason: this one has to resolve
 * each screen's rotation, and resolving a rotation is half a dozen queries
 * (screen, playlists, media, app instances, their cached data). At the matrix's
 * limit that is well over a thousand queries for a single page view. Fifty is
 * more screens than anyone reads in one sitting, and the cut is reported.
 */
const MAX_PLAN_SCREENS = 50;

/**
 * How much of an expected hour must be filled by a SINGLE uninterrupted item
 * before the hour is called stuck.
 *
 * A rotation cycles: every hour of a healthy screen contains many plays of
 * several items. One play covering most of an hour means the loop stopped
 * turning — the failure that is invisible from outside, because the screen is
 * lit, showing something, and reporting in. A screen whose whole content is one
 * long video legitimately looks like this too, which is why the exception names
 * the item: the operator recognises their own configuration at a glance.
 */
const STUCK_COVERAGE = 0.6;

/**
 * How much of an hour's content must be a takeover before the hour is called
 * one. A takeover holds the whole screen by definition, so anything short of
 * most of the hour means it started or ended part-way through — and the hour is
 * then better described by what it mostly was.
 */
const TAKEOVER_SHARE = 0.5;

export type CoverageState =
  | 'idle'
  | 'off'
  | 'stuck'
  | 'covered'
  | 'quiet'
  | 'takeover';

/**
 * App slugs that take the whole screen when they are switched on.
 *
 * Read from the shared manifests rather than hard-coded, so a second takeover
 * app added later is understood by the report without anyone remembering to
 * update a list here.
 */
const TAKEOVER_SLUGS = new Set(
  APP_MANIFESTS.filter((manifest) => manifest.takeover).map(
    (manifest) => manifest.slug,
  ),
);

export interface CoverageCell {
  state: CoverageState;
  /** 1–4 for `covered`, 0 otherwise. A step on the sequential ramp. */
  level: number;
  coveredMs: number;
  expectedMs: number;
  plays: number;
}

export interface CoverageRow {
  screenId: string;
  name: string;
  cells: CoverageCell[];
  /** Percentage of expected time that had content; null when nothing was expected. */
  coverage: number | null;
}

export interface CoverageException {
  screenId: string;
  screenName: string;
  /**
   * `takeover` is not a fault — it is the explanation for one. An advertiser
   * asking why their spot did not run on Tuesday afternoon is owed the real
   * answer, which is that the screen was showing an emergency notice.
   */
  kind: 'off' | 'stuck' | 'takeover';
  fromHour: number;
  /** Exclusive, so 14→18 reads as "from 14:00 to 18:00". */
  toHour: number;
  durationMs: number;
  /** For a stuck run: what it was stuck on. */
  itemName?: string;
}

export interface CoverageReport {
  day: string;
  /** Set when the matrix shows ONE item rather than everything on the screen. */
  focus?: { kind: 'item' | 'campaign'; id: string; name: string };
  coverage: number | null;
  screens: CoverageRow[];
  exceptions: CoverageException[];
  totals: { plays: number; airtimeMs: number; screens: number };
  /** True when more screens exist than the matrix shows. */
  truncated: boolean;
}

export interface PlaybackItemRow {
  contentId: string;
  name: string;
  /** The campaign this item was sold as part of, when it has one. */
  campaignId?: string;
  campaignName?: string;
  kind?: string;
  plays: number;
  airtimeMs: number;
  /** How many distinct screens ran it — the breakdown a multi-site client asks for. */
  screens: number;
  screenNames: string[];
  /** Share of the range's total measured airtime, 0–100. */
  share: number;
  firstAt?: string;
  lastAt?: string;
}

export interface PlaybackItemsReport {
  from: string;
  to: string;
  items: PlaybackItemRow[];
  /**
   * The same playback grouped the way it was sold — one row per campaign, plus
   * an unassigned bucket. Present only when asked for, because grouping is a
   * choice the operator makes, not a default the report imposes.
   */
  campaigns?: PlaybackCampaignRow[];
  totals: { plays: number; airtimeMs: number };
  truncated: boolean;
}

export interface PlaybackCampaignRow {
  /** Null for the bucket of everything that belongs to no campaign. */
  campaignId: string | null;
  name: string;
  plays: number;
  airtimeMs: number;
  share: number;
  /** Distinct screens across every item in the campaign. */
  screens: number;
  items: number;
  contentIds: string[];
}

/** Plays and measured airtime by hour of day, summed over a range. */
export interface DaypartingReport {
  from: string;
  to: string;
  plays: number[];
  airtimeMs: number[];
}

export interface PlanRow {
  screenId: string;
  screenName: string;
  contentId: string;
  name: string;
  plannedPlays: number;
  actualPlays: number;
  /** actual − planned. Negative is the interesting direction. */
  delta: number;
  /** Actual as a percentage of planned; null when nothing was planned. */
  ratio: number | null;
}

export interface PlanReport {
  day: string;
  rows: PlanRow[];
  /** True when more screens were eligible than the report resolved. */
  truncated: boolean;
  /**
   * The plan is read from the rotation as it stands NOW, not as it stood on the
   * reported day — nothing records the latter. A playlist edited since then
   * makes the planned column an estimate, which is said rather than hidden.
   */
  basis: 'current-rotation';
}

/** One playable entry of a screen's rotation, as the plan reads it. */
interface RotationItem {
  id: string;
  contentId?: string;
  durationMs: number;
  name?: string;
  slug?: string;
}

/** Minimal shape of a screen the report needs. */
interface ScreenLike {
  _id: Types.ObjectId;
  name?: string;
  availability?: AvailabilityLike;
}

interface AvailabilityLike {
  mode?: string;
  weekly?: { day?: string; enabled?: boolean; start?: string; end?: string }[];
  special?: {
    startDate?: string;
    endDate?: string;
    start?: string;
    end?: string;
  };
}

/** A fresh 24-slot array of zeros. */
const EMPTY_HOURS = (): number[] => new Array<number>(24).fill(0);

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

@Injectable()
export class PlaybackReportService {
  constructor(
    private readonly playback: PlaybackRepository,
    private readonly screens: ScreensRepository,
    private readonly media: MediaRepository,
    private readonly appInstances: AppInstancesRepository,
    private readonly campaigns: CampaignsRepository,
    private readonly content: PlayerContentService,
  ) {}

  /**
   * The coverage matrix for one local day: a row per screen, a cell per hour.
   */
  async coverage(
    organizationId: string,
    day: string,
    focus?: { contentId?: string; campaignId?: string },
  ): Promise<CoverageReport> {
    const [allRows, allScreens] = await Promise.all([
      this.playback.findDay(organizationId, day),
      this.screens.findAllSummariesByOrganization(organizationId) as Promise<
        ScreenLike[]
      >,
    ]);

    // Focusing narrows WHICH playback is drawn, never which hours were expected:
    // "where and when did my spot run" is only answerable against the same
    // working hours as everything else.
    const lens = await this.resolveFocus(organizationId, focus);
    const rows = lens
      ? allRows.filter((row) => lens.contentIds.has(row.contentId))
      : allRows;

    const screens = allScreens.slice(0, MAX_MATRIX_SCREENS);
    const byScreen = new Map<string, PlaybackDayRow[]>();
    for (const row of rows) {
      const key = row.screenId.toString();
      const bucket = byScreen.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        byScreen.set(key, [row]);
      }
    }

    const names = await this.resolveNames(organizationId, rows);

    const matrix: CoverageRow[] = [];
    const exceptions: CoverageException[] = [];
    let coveredTotal = 0;
    let expectedTotal = 0;
    let plays = 0;
    let airtimeMs = 0;

    for (const screen of screens) {
      const screenId = screen._id.toString();
      const screenRows = byScreen.get(screenId) ?? [];
      const expected = expectedMinutesPerHour(screen.availability, day);
      const cells: CoverageCell[] = [];

      for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
        const expectedMs = expected[hour] * 60_000;
        let coveredMs = 0;
        let takeoverMs = 0;
        let hourPlays = 0;
        let items = 0;
        for (const row of screenRows) {
          const ms = row.airtime?.[String(hour)] ?? 0;
          if (ms > 0) {
            items += 1;
            coveredMs += ms;
            if (row.slug && TAKEOVER_SLUGS.has(row.slug)) {
              takeoverMs += ms;
            }
          }
          hourPlays += row.hours?.[String(hour)] ?? 0;
        }

        cells.push(
          lens
            ? focusCell(expectedMs, coveredMs, hourPlays)
            : cell(expectedMs, coveredMs, hourPlays, items, takeoverMs),
        );
        coveredTotal += Math.min(coveredMs, expectedMs);
        expectedTotal += expectedMs;
      }

      for (const row of screenRows) {
        plays += row.plays;
        airtimeMs += row.airtimeMs;
      }

      matrix.push({
        screenId,
        name: screen.name ?? screenId,
        cells,
        coverage: percentage(
          cells.reduce(
            (sum, c) => sum + Math.min(c.coveredMs, c.expectedMs),
            0,
          ),
          cells.reduce((sum, c) => sum + c.expectedMs, 0),
        ),
      });

      if (!lens) {
        exceptions.push(
          ...runsOf(
            cells,
            screenId,
            screen.name ?? screenId,
            screenRows,
            names,
          ),
        );
      }
    }

    return {
      day,
      ...(lens ? { focus: lens.focus } : {}),
      coverage: percentage(coveredTotal, expectedTotal),
      screens: matrix,
      // Worst first: the point of the list is what needs attention, and an
      // operator with twenty screens should not have to read to the bottom.
      exceptions: exceptions.sort((a, b) => b.durationMs - a.durationMs),
      totals: { plays, airtimeMs, screens: screens.length },
      truncated: allScreens.length > screens.length,
    };
  }

  /** The per-item table for a date range, with names resolved. */
  async items(
    organizationId: string,
    from: string,
    to: string,
    screenIds?: string[],
    groupByCampaign = false,
  ): Promise<PlaybackItemsReport> {
    const { items, totals } = await this.playback.aggregateItems(
      organizationId,
      from,
      to,
      screenIds,
    );

    const names = await this.resolveNames(
      organizationId,
      items.map((item) => ({
        contentId: item._id,
        kind: item.kind,
        slug: item.slug,
      })),
    );
    const screenNames = await this.resolveScreenNames(
      organizationId,
      items.flatMap((item) => item.screenIds.map((id) => id.toString())),
    );

    const membership = await this.campaigns.membershipMap(organizationId);

    const rows = items.map((item) => {
      const campaign = membership.get(item._id);
      return {
        contentId: item._id,
        name: names.get(item._id) ?? item.slug ?? item._id,
        ...(campaign
          ? {
              campaignId: campaign._id.toString(),
              campaignName: campaign.name,
            }
          : {}),
        ...(item.kind ? { kind: item.kind } : {}),
        plays: item.plays,
        airtimeMs: item.airtimeMs,
        screens: item.screenIds.length,
        screenNames: item.screenIds.map(
          (id) => screenNames.get(id.toString()) ?? id.toString(),
        ),
        share: percentage(item.airtimeMs, totals.airtimeMs) ?? 0,
        ...(item.firstAt ? { firstAt: item.firstAt.toISOString() } : {}),
        ...(item.lastAt ? { lastAt: item.lastAt.toISOString() } : {}),
      };
    });

    return {
      from,
      to,
      items: rows,
      ...(groupByCampaign
        ? { campaigns: groupByCampaigns(rows, items, totals.airtimeMs) }
        : {}),
      totals,
      truncated: items.length >= PLAYBACK_ITEM_LIMIT,
    };
  }

  /** Plays and airtime by hour of day — the dayparting question. */
  async dayparting(
    organizationId: string,
    from: string,
    to: string,
    filter: {
      contentId?: string;
      campaignId?: string;
      screenIds?: string[];
    } = {},
  ): Promise<DaypartingReport> {
    const lens = await this.resolveFocus(organizationId, filter);
    if (lens && lens.contentIds.size === 0) {
      // A campaign with nothing assigned yet. Passing an empty filter down would
      // read as "no filter" and answer with the whole organization's playback
      // under that campaign's name — a wrong number that looks authoritative.
      return { from, to, plays: EMPTY_HOURS(), airtimeMs: EMPTY_HOURS() };
    }

    const hours = await this.playback.aggregateHours(organizationId, from, to, {
      ...(lens ? { contentIds: [...lens.contentIds] } : {}),
      ...(filter.screenIds ? { screenIds: filter.screenIds } : {}),
    });
    return { from, to, ...hours };
  }

  /**
   * What the rotation says should have played, next to what did.
   *
   * The planned figure comes from arithmetic the operator can check: a rotation
   * is a loop, so each item plays once per turn, and the number of turns is the
   * expected on-air time divided by the length of one loop. Where the two
   * columns disagree is where something was skipped, stuck, or off — and unlike
   * the coverage matrix this names the ITEM responsible.
   */
  async plan(organizationId: string, day: string): Promise<PlanReport> {
    const [rows, allScreens] = await Promise.all([
      this.playback.findDay(organizationId, day),
      this.screens.findAllSummariesByOrganization(organizationId) as Promise<
        ScreenLike[]
      >,
    ]);

    const names = await this.resolveNames(organizationId, rows);
    const planRows: PlanRow[] = [];

    // Only screens that were expected to be on can be short of a plan, and
    // filtering first means the expensive part never runs for the rest.
    const open = allScreens.filter(
      (screen) =>
        expectedMinutesPerHour(screen.availability, day).reduce(
          (sum, minutes) => sum + minutes,
          0,
        ) > 0,
    );
    const screens = open.slice(0, MAX_PLAN_SCREENS);

    for (const screen of screens) {
      const screenId = screen._id.toString();
      const expectedMs =
        expectedMinutesPerHour(screen.availability, day).reduce(
          (sum, minutes) => sum + minutes,
          0,
        ) * 60_000;

      const snapshot = await this.content.resolveByScreenId(
        organizationId,
        screenId,
      );
      const rotation: RotationItem[] = (snapshot?.items ?? [])
        .filter((item) => item.durationMs > 0)
        .map((item) => ({
          id: item.id,
          contentId: item.contentId,
          durationMs: item.durationMs,
          ...('name' in item && typeof item.name === 'string'
            ? { name: item.name }
            : {}),
          ...('slug' in item && typeof item.slug === 'string'
            ? { slug: item.slug }
            : {}),
        }));
      const loopMs = rotation.reduce((sum, item) => sum + item.durationMs, 0);
      if (loopMs === 0) {
        continue;
      }
      const loops = expectedMs / loopMs;

      const actual = new Map<string, number>();
      for (const row of rows) {
        if (row.screenId.toString() === screenId) {
          actual.set(
            row.contentId,
            (actual.get(row.contentId) ?? 0) + row.plays,
          );
        }
      }

      for (const item of rotation) {
        const contentId = item.contentId ?? item.id;
        const plannedPlays = Math.round(loops);
        const actualPlays = actual.get(contentId) ?? 0;
        planRows.push({
          screenId,
          screenName: screen.name ?? screenId,
          contentId,
          name: names.get(contentId) ?? nameOf(item) ?? contentId,
          plannedPlays,
          actualPlays,
          delta: actualPlays - plannedPlays,
          ratio: percentage(actualPlays, plannedPlays),
        });
      }
    }

    // Worst shortfall first — the whole point of the comparison.
    planRows.sort((a, b) => a.delta - b.delta);
    return {
      day,
      rows: planRows,
      truncated: open.length > screens.length,
      basis: 'current-rotation',
    };
  }

  /**
   * Turns a requested focus into the set of content ids it covers.
   *
   * A campaign is several files; an item is one. Both end up as a set, so
   * everything downstream is written once.
   */
  private async resolveFocus(
    organizationId: string,
    focus?: { contentId?: string; campaignId?: string },
  ): Promise<{
    contentIds: Set<string>;
    focus: { kind: 'item' | 'campaign'; id: string; name: string };
  } | null> {
    if (focus?.campaignId) {
      const campaign = await this.campaigns.findById(
        organizationId,
        focus.campaignId,
      );
      if (!campaign) {
        return null;
      }
      return {
        contentIds: new Set(campaign.contentIds),
        focus: {
          kind: 'campaign',
          id: campaign._id.toString(),
          name: campaign.name,
        },
      };
    }

    if (focus?.contentId) {
      const names = await this.resolveNames(organizationId, [
        { contentId: focus.contentId },
      ]);
      return {
        contentIds: new Set([focus.contentId]),
        focus: {
          kind: 'item',
          id: focus.contentId,
          name: names.get(focus.contentId) ?? focus.contentId,
        },
      };
    }

    return null;
  }

  /**
   * Names for the content ids in a set of rows.
   *
   * Two batched lookups, split by kind, and a missing name is not an error: the
   * item may have been deleted since it played, and a report that refused to
   * render because of that would be useless precisely when it is most needed —
   * a campaign that ended, reported afterwards.
   */
  private async resolveNames(
    organizationId: string,
    rows: { contentId: string; kind?: string; slug?: string }[],
  ): Promise<Map<string, string>> {
    const mediaIds = new Set<string>();
    const appIds = new Set<string>();
    for (const row of rows) {
      if (!Types.ObjectId.isValid(row.contentId)) {
        continue;
      }
      if (row.kind === 'app') {
        appIds.add(row.contentId);
      } else {
        mediaIds.add(row.contentId);
      }
    }

    const [mediaItems, instances] = await Promise.all([
      mediaIds.size
        ? this.media.findByIds(organizationId, [...mediaIds])
        : Promise.resolve([]),
      appIds.size
        ? this.appInstances.findByIds(organizationId, [...appIds])
        : Promise.resolve([]),
    ]);

    const names = new Map<string, string>();
    for (const item of mediaItems) {
      names.set(item._id.toString(), item.name);
    }
    for (const instance of instances) {
      names.set(instance._id.toString(), instance.name);
    }
    return names;
  }

  private async resolveScreenNames(
    organizationId: string,
    ids: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id));
    if (unique.length === 0) {
      return new Map();
    }
    const screens = (await this.screens.findSummariesByIds(
      organizationId,
      unique,
    )) as ScreenLike[];
    return new Map(
      screens.map((screen) => [
        screen._id.toString(),
        screen.name ?? screen._id.toString(),
      ]),
    );
  }
}

/** Classifies one hour of one screen. */
function cell(
  expectedMs: number,
  coveredMs: number,
  plays: number,
  items: number,
  takeoverMs: number,
): CoverageCell {
  if (expectedMs === 0) {
    // The screen was not supposed to be showing anything. An empty hour here is
    // the rule working, not a fault, and colouring it as a gap would bury the
    // real gaps under every night of every week.
    return { state: 'idle', level: 0, coveredMs, expectedMs, plays };
  }
  if (coveredMs === 0) {
    return { state: 'off', level: 0, coveredMs, expectedMs, plays };
  }
  if (takeoverMs > 0 && takeoverMs >= coveredMs * TAKEOVER_SHARE) {
    // The screen was working and showing what it was told to show. Drawn as
    // itself rather than as ordinary content, because an hour of evacuation
    // notice and an hour of rotation are not the same answer to "what was on
    // this screen" — and drawn as itself rather than as an outage, because the
    // screen did nothing wrong.
    return { state: 'takeover', level: 0, coveredMs, expectedMs, plays };
  }
  if (items <= 1 && plays <= 1 && coveredMs >= expectedMs * STUCK_COVERAGE) {
    return { state: 'stuck', level: 0, coveredMs, expectedMs, plays };
  }
  const ratio = Math.min(1, coveredMs / expectedMs);
  return {
    state: 'covered',
    level: Math.min(4, Math.max(1, Math.ceil(ratio * 4))),
    coveredMs,
    expectedMs,
    plays,
  };
}

/**
 * The same rows, added up the way they were sold.
 *
 * Everything with no campaign lands in one honest bucket rather than being
 * dropped: an operator looking at a campaign report needs to see what is NOT yet
 * assigned, or the first month's numbers quietly under-report.
 */
function groupByCampaigns(
  rows: PlaybackItemRow[],
  totals: { _id: string; screenIds: { toString(): string }[] }[],
  totalAirtimeMs: number,
): PlaybackCampaignRow[] {
  const screensByItem = new Map(
    totals.map((item) => [item._id, item.screenIds.map((id) => id.toString())]),
  );
  const groups = new Map<
    string,
    PlaybackCampaignRow & { screenSet: Set<string> }
  >();

  for (const row of rows) {
    const key = row.campaignId ?? '';
    let group = groups.get(key);
    if (!group) {
      group = {
        campaignId: row.campaignId ?? null,
        name: row.campaignName ?? '',
        plays: 0,
        airtimeMs: 0,
        share: 0,
        screens: 0,
        items: 0,
        contentIds: [],
        screenSet: new Set<string>(),
      };
      groups.set(key, group);
    }
    group.plays += row.plays;
    group.airtimeMs += row.airtimeMs;
    group.items += 1;
    group.contentIds.push(row.contentId);
    for (const screenId of screensByItem.get(row.contentId) ?? []) {
      group.screenSet.add(screenId);
    }
  }

  return [...groups.values()]
    .map(({ screenSet, ...group }) => ({
      ...group,
      screens: screenSet.size,
      share: percentage(group.airtimeMs, totalAirtimeMs) ?? 0,
    }))
    .sort((a, b) => b.airtimeMs - a.airtimeMs);
}

/** A renderable's own label, when the content itself has since been deleted. */
function nameOf(item: { name?: string; slug?: string }): string | undefined {
  return item.name ?? item.slug;
}

/**
 * One hour of one screen, when the matrix is showing a single item.
 *
 * `off` and `stuck` are deliberately absent here. An hour without this
 * particular spot is not a fault — it is the rest of the rotation doing its job
 * — and painting it as an outage would turn every focused view into a wall of
 * red. What the reader wants is where and when it ran, so the ramp is the answer
 * and everything else is quiet.
 */
function focusCell(
  expectedMs: number,
  coveredMs: number,
  plays: number,
): CoverageCell {
  if (expectedMs === 0) {
    return { state: 'idle', level: 0, coveredMs, expectedMs, plays };
  }
  if (coveredMs === 0) {
    return { state: 'quiet', level: 0, coveredMs, expectedMs, plays };
  }
  const ratio = Math.min(1, coveredMs / expectedMs);
  return {
    state: 'covered',
    level: Math.min(4, Math.max(1, Math.ceil(ratio * 4))),
    coveredMs,
    expectedMs,
    plays,
  };
}

/** Collapses neighbouring bad hours into one sentence-sized exception. */
function runsOf(
  cells: CoverageCell[],
  screenId: string,
  screenName: string,
  rows: PlaybackDayRow[],
  names: Map<string, string>,
): CoverageException[] {
  const exceptions: CoverageException[] = [];
  let start: number | null = null;
  let kind: 'off' | 'stuck' | 'takeover' | null = null;

  const close = (end: number): void => {
    if (start === null || kind === null) {
      return;
    }
    const run = cells.slice(start, end);
    exceptions.push({
      screenId,
      screenName,
      kind,
      fromHour: start,
      toHour: end,
      durationMs: run.reduce(
        (sum, c) => sum + (kind === 'off' ? c.expectedMs : c.coveredMs),
        0,
      ),
      ...(kind === 'stuck' || kind === 'takeover'
        ? { itemName: dominantItem(rows, start, end, names) }
        : {}),
    });
    start = null;
    kind = null;
  };

  cells.forEach((current, hour) => {
    const state =
      current.state === 'off' ||
      current.state === 'stuck' ||
      current.state === 'takeover'
        ? current.state
        : null;
    if (state !== kind) {
      close(hour);
    }
    if (state && start === null) {
      start = hour;
      kind = state;
    }
  });
  close(cells.length);

  return exceptions;
}

/** What a stuck screen was stuck on: whatever held the screen longest. */
function dominantItem(
  rows: PlaybackDayRow[],
  fromHour: number,
  toHour: number,
  names: Map<string, string>,
): string | undefined {
  let best: { id: string; ms: number } | null = null;
  for (const row of rows) {
    let ms = 0;
    for (let hour = fromHour; hour < toHour; hour += 1) {
      ms += row.airtime?.[String(hour)] ?? 0;
    }
    if (ms > 0 && (!best || ms > best.ms)) {
      best = { id: row.contentId, ms };
    }
  }
  if (!best) {
    return undefined;
  }
  return names.get(best.id) ?? best.id;
}

/**
 * Expected minutes of content per local hour, from the screen's own rule.
 *
 * Evaluated in wall-clock terms rather than through the shared instant-based
 * evaluator, because the two answer different questions: that one says "is the
 * screen on right now", this one needs "how many minutes of local hour 9 was it
 * meant to be on". Both sides of the comparison — this and the device's hour
 * buckets — are then in the same local frame, with no timezone conversion to get
 * wrong. The rules mirrored here are the shared evaluator's: a window needs a
 * strict HH:mm start before its end, and anything else means the day is closed.
 *
 * A DST day is 23 or 25 hours long and this treats every day as 24; on a
 * coverage bar that is one hour out of a year, and correcting it would mean
 * carrying a timezone database into a report.
 */
function expectedMinutesPerHour(
  availability: AvailabilityLike | undefined,
  day: string,
): number[] {
  const closed = new Array<number>(HOURS_IN_DAY).fill(0);
  if (!availability || availability.mode === 'always') {
    // No rule at all means always on — the same default the player applies.
    return new Array<number>(HOURS_IN_DAY).fill(60);
  }

  if (availability.mode === 'weekly') {
    const weekday = weekdayOf(day);
    if (!weekday) {
      return closed;
    }
    const entry = availability.weekly?.find((item) => item.day === weekday);
    if (!entry?.enabled) {
      return closed;
    }
    return window(entry.start, entry.end) ?? closed;
  }

  if (availability.mode === 'special') {
    const special = availability.special;
    if (
      !special?.startDate ||
      !special.endDate ||
      day < special.startDate ||
      day > special.endDate
    ) {
      return closed;
    }
    return window(special.start, special.end) ?? closed;
  }

  return closed;
}

/** Minutes of each hour covered by a local 'HH:mm'–'HH:mm' window. */
function window(start?: string, end?: string): number[] | null {
  const from = minutesOf(start);
  const to = minutesOf(end);
  if (from === null || to === null || to <= from) {
    return null;
  }
  const hours = new Array<number>(HOURS_IN_DAY).fill(0);
  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    const hourStart = hour * 60;
    const overlap = Math.min(to, hourStart + 60) - Math.max(from, hourStart);
    hours[hour] = Math.max(0, overlap);
  }
  return hours;
}

function minutesOf(value?: string): number | null {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(3, 5));
  if (hour > 23 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
}

/** Weekday name of a 'YYYY-MM-DD', read as a plain calendar date. */
function weekdayOf(day: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return undefined;
  }
  const at = Date.parse(`${day}T00:00:00.000Z`);
  if (Number.isNaN(at)) {
    return undefined;
  }
  return WEEKDAYS[new Date(at).getUTCDay()];
}

/** A percentage, or null when there is nothing to be a percentage of. */
function percentage(part: number, whole: number): number | null {
  if (whole <= 0) {
    return null;
  }
  return Math.round((part / whole) * 1000) / 10;
}
