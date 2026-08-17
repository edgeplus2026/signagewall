import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model, Types } from 'mongoose';

import {
  PlaybackMonth,
  PlaybackMonthDocument,
} from './schemas/playback-month.schema';
import {
  PLAYBACK_RETENTION_DAYS,
  PlaybackRecord,
  PlaybackRecordDocument,
} from './schemas/playback-record.schema';

/** One validated tally, ready to be added into its buckets. */
export interface PlaybackWrite {
  organizationId: Types.ObjectId;
  screenId: Types.ObjectId;
  contentId: string;
  /** Device-local calendar day, 'YYYY-MM-DD'. */
  day: string;
  kind?: string;
  slug?: string;
  plays: number;
  airtimeMs: number;
  /** Hour of day ('0'–'23') to play count. */
  hours: Record<string, number>;
  /** Hour of day ('0'–'23') to measured airtime in milliseconds. */
  airtime: Record<string, number>;
  firstAt: Date;
  lastAt: Date;
  clockCorrected: boolean;
}

/**
 * What actually landed.
 *
 * `applied` is what the caller needs to decide whether a failed batch may be
 * retried: nothing applied means the retry is safe, something applied means a
 * retry would count those rows twice. See the ingest service.
 */
export interface PlaybackWriteOutcome {
  /** Daily bucket rows that actually landed. */
  applied: number;
  /** Whether every daily row landed. The rollup is reported separately, in logs. */
  complete: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Most items one range report will name.
 *
 * A screen runs a handful of items; an organization with hundreds of screens and
 * a big library can still produce a long tail of one-off content. The table is
 * read top-down and nobody scrolls past a few hundred rows, so the tail is cut
 * — but the totals are not (see the aggregation), and the caller is told.
 */
const ITEM_LIMIT = 500;

/** One daily bucket, as the coverage report reads it. */
export interface PlaybackDayRow {
  screenId: Types.ObjectId;
  contentId: string;
  kind?: string;
  slug?: string;
  plays: number;
  airtimeMs: number;
  hours?: Record<string, number>;
  airtime?: Record<string, number>;
}

/** One content item summed over a date range. */
export interface PlaybackItemTotal {
  _id: string;
  plays: number;
  airtimeMs: number;
  screenIds: Types.ObjectId[];
  kind?: string;
  slug?: string;
  firstAt?: Date;
  lastAt?: Date;
}

export interface PlaybackTotals {
  plays: number;
  airtimeMs: number;
}

/** Exported so the report can say the table was cut rather than imply it wasn't. */
export const PLAYBACK_ITEM_LIMIT = ITEM_LIMIT;

/** Drops undefined values, which the driver rejects inside `$setOnInsert`. */
function defined(source: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined),
  );
}

@Injectable()
export class PlaybackRepository {
  private readonly logger = new Logger(PlaybackRepository.name);

  constructor(
    @InjectModel(PlaybackRecord.name)
    private readonly recordModel: Model<PlaybackRecordDocument>,
    @InjectModel(PlaybackMonth.name)
    private readonly monthModel: Model<PlaybackMonthDocument>,
  ) {}

  /**
   * Adds a batch into the daily buckets and the monthly rollup.
   *
   * Everything is `$inc` into an upserted bucket, so a screen reporting every
   * five minutes touches the same handful of rows all day instead of inserting
   * new ones — which is the difference between a few hundred writes a second
   * across a five-thousand-screen fleet and a few hundred thousand.
   *
   * Unordered on purpose: one malformed row must not stop the rest of a screen's
   * day from being recorded.
   */
  async recordBatch(writes: PlaybackWrite[]): Promise<PlaybackWriteOutcome> {
    if (writes.length === 0) {
      return { applied: 0, complete: true };
    }

    const dailyOps = writes.map((entry) => this.dailyOp(entry));
    const daily = await this.write('daily', dailyOps.length, () =>
      this.recordModel.bulkWrite(dailyOps, { ordered: false }),
    );

    if (daily.applied === 0) {
      // Nothing landed, so the caller will hand the batch back for a retry. The
      // rollup must not be written either, or the retry would add it twice.
      return daily;
    }

    // The daily rows are the evidence of record; the rollup is the summary that
    // outlives them. It is written in the same call for a reason — see the
    // schema — but the two cannot fail together: by now the daily rows are in,
    // so a rollup failure is logged rather than retried. It can be rebuilt from
    // the daily rows while those still exist; a double count could not be undone
    // at all. The reported outcome is therefore the DAILY one, which is what
    // decides whether the device may forget the batch.
    const monthOps = writes.map((entry) => this.monthOp(entry));
    const monthly = await this.write('monthly', monthOps.length, () =>
      this.monthModel.bulkWrite(monthOps, { ordered: false }),
    );

    if (!monthly.complete) {
      this.logger.error(
        `Playback rollup incomplete for screen ${writes[0]?.screenId.toString() ?? '?'} ` +
          `(${String(monthly.applied)}/${String(monthOps.length)}); ` +
          `daily rows are authoritative and can rebuild it`,
      );
    }

    return daily;
  }

  /**
   * Every row a screen produced on one local day, for the coverage matrix.
   *
   * Lean because nothing here is edited — this is a read for a report, and
   * hydrating a few thousand Mongoose documents to add up numbers is work paid
   * for nothing.
   */
  findDay(organizationId: string, day: string): Promise<PlaybackDayRow[]> {
    return this.recordModel
      .find(
        { organizationId: new Types.ObjectId(organizationId), day },
        {
          screenId: 1,
          contentId: 1,
          kind: 1,
          slug: 1,
          plays: 1,
          airtimeMs: 1,
          hours: 1,
          airtime: 1,
        },
      )
      .lean<PlaybackDayRow[]>()
      .exec();
  }

  /**
   * Totals per content item over a date range — the table an advertiser reads.
   *
   * Summed in the database rather than in Node: a quarter of a large fleet's
   * rows is a lot to pull across the wire to add up, and the index on
   * (organizationId, day) already narrows it to the range.
   */
  async aggregateItems(
    organizationId: string,
    from: string,
    to: string,
    screenIds?: string[],
  ): Promise<{ items: PlaybackItemTotal[]; totals: PlaybackTotals }> {
    const match: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
      day: { $gte: from, $lte: to },
    };
    if (screenIds?.length) {
      match.screenId = { $in: screenIds.map((id) => new Types.ObjectId(id)) };
    }

    const [result] = await this.recordModel
      .aggregate<{ items: PlaybackItemTotal[]; totals: PlaybackTotals[] }>([
        { $match: match },
        {
          $facet: {
            items: [
              {
                $group: {
                  _id: '$contentId',
                  plays: { $sum: '$plays' },
                  airtimeMs: { $sum: '$airtimeMs' },
                  screenIds: { $addToSet: '$screenId' },
                  kind: { $first: '$kind' },
                  slug: { $first: '$slug' },
                  firstAt: { $min: '$firstAt' },
                  lastAt: { $max: '$lastAt' },
                },
              },
              { $sort: { airtimeMs: -1 } },
              { $limit: ITEM_LIMIT },
            ],
            // Totals are computed over everything, not over the truncated list:
            // a share of a total that silently excluded the tail would not add
            // up to 100% and nobody would be able to see why.
            totals: [
              {
                $group: {
                  _id: null,
                  plays: { $sum: '$plays' },
                  airtimeMs: { $sum: '$airtimeMs' },
                },
              },
            ],
          },
        },
      ])
      .exec();

    return {
      items: result?.items ?? [],
      totals: result?.totals[0] ?? { plays: 0, airtimeMs: 0 },
    };
  }

  /**
   * Plays and airtime summed by hour of day across a range.
   *
   * The histograms are sparse maps, so they are expanded with `$objectToArray`
   * and summed in the database. Doing it here rather than in Node is the
   * difference between moving a quarter's worth of rows across the wire and
   * moving twenty-four numbers.
   */
  async aggregateHours(
    organizationId: string,
    from: string,
    to: string,
    filter: { contentIds?: string[]; screenIds?: string[] } = {},
  ): Promise<{ plays: number[]; airtimeMs: number[] }> {
    const match: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
      day: { $gte: from, $lte: to },
    };
    if (filter.contentIds?.length) {
      match.contentId = { $in: filter.contentIds };
    }
    if (filter.screenIds?.length) {
      match.screenId = {
        $in: filter.screenIds.map((id) => new Types.ObjectId(id)),
      };
    }

    const [result] = await this.recordModel
      .aggregate<{
        plays: { _id: string; total: number }[];
        airtime: { _id: string; total: number }[];
      }>([
        { $match: match },
        {
          $project: {
            hours: { $objectToArray: { $ifNull: ['$hours', {}] } },
            airtime: { $objectToArray: { $ifNull: ['$airtime', {}] } },
          },
        },
        {
          $facet: {
            plays: [
              { $unwind: '$hours' },
              { $group: { _id: '$hours.k', total: { $sum: '$hours.v' } } },
            ],
            airtime: [
              { $unwind: '$airtime' },
              { $group: { _id: '$airtime.k', total: { $sum: '$airtime.v' } } },
            ],
          },
        },
      ])
      .exec();

    return {
      plays: toHourArray(result?.plays),
      airtimeMs: toHourArray(result?.airtime),
    };
  }

  private dailyOp(
    entry: PlaybackWrite,
  ): AnyBulkWriteOperation<PlaybackRecordDocument> {
    return {
      updateOne: {
        filter: {
          screenId: entry.screenId,
          day: entry.day,
          contentId: entry.contentId,
        },
        update: {
          $inc: {
            plays: entry.plays,
            airtimeMs: entry.airtimeMs,
            ...Object.fromEntries(
              Object.entries(entry.hours).map(([hour, count]) => [
                `hours.${hour}`,
                count,
              ]),
            ),
            ...Object.fromEntries(
              Object.entries(entry.airtime).map(([hour, ms]) => [
                `airtime.${hour}`,
                ms,
              ]),
            ),
          },
          $setOnInsert: defined({
            organizationId: entry.organizationId,
            kind: entry.kind,
            slug: entry.slug,
            expiresAt: expiryFor(entry.day),
          }),
          // A batch can arrive out of order (a retry after a reconnect carries
          // older plays than the one that overtook it), so the extremes are
          // widened rather than overwritten.
          $min: { firstAt: entry.firstAt },
          $max: { lastAt: entry.lastAt },
          ...(entry.clockCorrected ? { $set: { clockCorrected: true } } : {}),
        },
        upsert: true,
      },
    };
  }

  private monthOp(
    entry: PlaybackWrite,
  ): AnyBulkWriteOperation<PlaybackMonthDocument> {
    return {
      updateOne: {
        filter: {
          screenId: entry.screenId,
          month: entry.day.slice(0, 7),
          contentId: entry.contentId,
        },
        update: {
          $inc: { plays: entry.plays, airtimeMs: entry.airtimeMs },
          $setOnInsert: defined({
            organizationId: entry.organizationId,
            kind: entry.kind,
            slug: entry.slug,
          }),
          $min: { firstAt: entry.firstAt },
          $max: { lastAt: entry.lastAt },
        },
        upsert: true,
      },
    };
  }

  /**
   * Runs one unordered bulk write and reports how much of it survived.
   *
   * A bulk write that fails part-way still applied the rest, and the driver only
   * says so inside the thrown error — which is exactly the number the caller
   * needs to decide whether a retry is safe. Reading it out here keeps that
   * awkwardness in one place.
   */
  private async write(
    label: string,
    expected: number,
    run: () => Promise<{ upsertedCount: number; modifiedCount: number }>,
  ): Promise<PlaybackWriteOutcome> {
    try {
      const result = await run();
      const applied = result.upsertedCount + result.modifiedCount;
      return { applied, complete: applied >= expected };
    } catch (error) {
      const partial = (
        error as {
          result?: { upsertedCount?: number; modifiedCount?: number };
        }
      ).result;
      const applied =
        (partial?.upsertedCount ?? 0) + (partial?.modifiedCount ?? 0);
      this.logger.error(
        `Playback ${label} write failed after ${String(applied)}/${String(expected)} ops: ` +
          (error instanceof Error ? error.message : String(error)),
      );
      return { applied, complete: false };
    }
  }
}

/** Turns `[{_id: '9', total: 12}]` into a dense 24-slot array. */
function toHourArray(
  rows: { _id: string; total: number }[] | undefined,
): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const row of rows ?? []) {
    const hour = Number(row._id);
    if (Number.isInteger(hour) && hour >= 0 && hour < 24) {
      hours[hour] = row.total;
    }
  }
  return hours;
}

/**
 * When a day's detail is deleted.
 *
 * The day is a device-local calendar day and the backend does not know the
 * device's timezone, so it is read as UTC and given a day's slack. Being a few
 * hours out on a ninety-day retention is not worth carrying a timezone for.
 */
function expiryFor(day: string): Date {
  const midnight = Date.parse(`${day}T00:00:00.000Z`);
  const base = Number.isNaN(midnight) ? Date.now() : midnight;
  return new Date(base + (PLAYBACK_RETENTION_DAYS + 1) * MS_PER_DAY);
}
