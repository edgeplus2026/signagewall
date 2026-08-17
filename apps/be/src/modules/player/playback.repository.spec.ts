import { Model, Types } from 'mongoose';

import { PlaybackRepository, PlaybackWrite } from './playback.repository';
import type { PlaybackMonthDocument } from './schemas/playback-month.schema';
import type { PlaybackRecordDocument } from './schemas/playback-record.schema';

type FakeModel = { bulkWrite: jest.Mock };

function buildRepository() {
  const applied = { upsertedCount: 1, modifiedCount: 0 };
  const recordModel: FakeModel = {
    bulkWrite: jest.fn().mockResolvedValue(applied),
  };
  const monthModel: FakeModel = {
    bulkWrite: jest.fn().mockResolvedValue(applied),
  };

  return {
    repository: new PlaybackRepository(
      recordModel as unknown as Model<PlaybackRecordDocument>,
      monthModel as unknown as Model<PlaybackMonthDocument>,
    ),
    recordModel,
    monthModel,
  };
}

function write(overrides: Partial<PlaybackWrite> = {}): PlaybackWrite {
  return {
    organizationId: new Types.ObjectId(),
    screenId: new Types.ObjectId(),
    contentId: 'media-1',
    day: '2026-08-17',
    kind: 'image',
    slug: undefined,
    plays: 12,
    airtimeMs: 180_000,
    hours: { '9': 8, '13': 4 },
    airtime: { '9': 120_000, '13': 60_000 },
    firstAt: new Date('2026-08-17T09:00:00.000Z'),
    lastAt: new Date('2026-08-17T13:30:00.000Z'),
    clockCorrected: false,
    ...overrides,
  };
}

/** The single update operation the repository built for `model`. */
function opFrom(model: FakeModel): {
  filter: Record<string, unknown>;
  update: Record<string, Record<string, unknown>>;
  upsert?: boolean;
} {
  const ops = model.bulkWrite.mock.calls[0]?.[0] as {
    updateOne: {
      filter: Record<string, unknown>;
      update: Record<string, Record<string, unknown>>;
      upsert?: boolean;
    };
  }[];
  return ops[0].updateOne;
}

describe('PlaybackRepository', () => {
  it('adds into a per-day bucket instead of inserting a row per delivery', async () => {
    const { repository, recordModel } = buildRepository();
    await repository.recordBatch([write()]);

    const op = opFrom(recordModel);
    expect(op.filter).toMatchObject({
      day: '2026-08-17',
      contentId: 'media-1',
    });
    expect(op.upsert).toBe(true);
    // Five minutes later the same screen reports again and lands on this row.
    expect(op.update.$inc).toMatchObject({
      plays: 12,
      airtimeMs: 180_000,
      'hours.9': 8,
      'hours.13': 4,
      // Coverage is read from these; play counts alone cannot fill an hour.
      'airtime.9': 120_000,
      'airtime.13': 60_000,
    });
  });

  it('widens the first/last seen rather than overwriting them', async () => {
    const { repository, recordModel } = buildRepository();
    await repository.recordBatch([write()]);

    // A retry after a reconnect can carry older plays than the batch that
    // overtook it, so the extremes have to survive arriving out of order.
    const op = opFrom(recordModel);
    expect(op.update.$min).toHaveProperty('firstAt');
    expect(op.update.$max).toHaveProperty('lastAt');
  });

  it('dates the retention from the day itself, not from when it arrived', async () => {
    const { repository, recordModel } = buildRepository();
    await repository.recordBatch([write({ day: '2026-01-05' })]);

    const expiresAt = opFrom(recordModel).update.$setOnInsert
      ?.expiresAt as Date;
    // A screen that was offline for a month must not buy its old playback an
    // extra month of retention by reporting it late.
    expect(expiresAt.toISOString().slice(0, 10)).toBe('2026-04-06');
  });

  it('omits fields the device did not report', async () => {
    const { repository, recordModel } = buildRepository();
    await repository.recordBatch([write({ kind: undefined, slug: undefined })]);

    const setOnInsert = opFrom(recordModel).update.$setOnInsert;
    expect(setOnInsert).not.toHaveProperty('kind');
    expect(setOnInsert).not.toHaveProperty('slug');
    expect(setOnInsert).toHaveProperty('organizationId');
  });

  it('marks a row whose day had to be inferred', async () => {
    const { repository, recordModel } = buildRepository();
    await repository.recordBatch([write({ clockCorrected: true })]);
    expect(opFrom(recordModel).update.$set).toEqual({ clockCorrected: true });
  });

  it('sums the same playback into a month that outlives the daily rows', async () => {
    const { repository, monthModel } = buildRepository();
    await repository.recordBatch([write()]);

    const op = opFrom(monthModel);
    expect(op.filter).toMatchObject({ month: '2026-08', contentId: 'media-1' });
    expect(op.update.$inc).toEqual({ plays: 12, airtimeMs: 180_000 });
    // Dayparting is deliberately absent from the rollup — see the schema.
    expect(JSON.stringify(op.update.$inc)).not.toContain('hours');
  });

  it('skips the rollup when no daily row landed', async () => {
    const { repository, recordModel, monthModel } = buildRepository();
    recordModel.bulkWrite.mockRejectedValue(new Error('no primary'));

    const outcome = await repository.recordBatch([write()]);

    expect(outcome).toEqual({ applied: 0, complete: false });
    // The caller is about to hand this batch back for a retry; writing the
    // rollup now would count it twice.
    expect(monthModel.bulkWrite).not.toHaveBeenCalled();
  });

  it('reports what survived a partial failure', async () => {
    const { repository, recordModel } = buildRepository();
    recordModel.bulkWrite.mockRejectedValue(
      Object.assign(new Error('one row rejected'), {
        result: { upsertedCount: 2, modifiedCount: 1 },
      }),
    );

    const outcome = await repository.recordBatch([
      write(),
      write(),
      write(),
      write(),
    ]);

    // Three of four landed: the batch must not be retried, and the caller needs
    // this number to know that.
    expect(outcome).toEqual({ applied: 3, complete: false });
  });

  it('still acknowledges a batch that normalised to nothing', async () => {
    const { repository, recordModel, monthModel } = buildRepository();
    const outcome = await repository.recordBatch([]);

    expect(outcome).toEqual({ applied: 0, complete: true });
    expect(recordModel.bulkWrite).not.toHaveBeenCalled();
    expect(monthModel.bulkWrite).not.toHaveBeenCalled();
  });
});
