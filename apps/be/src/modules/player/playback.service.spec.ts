import { Types } from 'mongoose';

import type { PlaybackBatch } from '@signagewall/player-contract';

import type { DevicesRepository } from './devices.repository';
import type {
  PlaybackRepository,
  PlaybackWrite,
  PlaybackWriteOutcome,
} from './playback.repository';
import { PlaybackService } from './playback.service';

const SCREEN_ID = new Types.ObjectId().toString();
const ORG_ID = new Types.ObjectId().toString();
const SOURCE = {
  deviceId: 'dev-1',
  screenId: SCREEN_ID,
  organizationId: ORG_ID,
};

/** Server "now", so skew and day arithmetic are decidable. */
const NOW = Date.parse('2026-08-17T12:00:00.000Z');

function buildService(
  options: {
    claimed?: boolean;
    outcome?: PlaybackWriteOutcome;
  } = {},
) {
  const claimPlaybackBatch = jest.fn().mockResolvedValue({
    accepted: options.claimed ?? true,
    previous: { origin: 'counter-a', seq: 4 },
  });
  const releasePlaybackBatch = jest.fn().mockResolvedValue(undefined);
  const recordBatch = jest
    .fn()
    .mockImplementation((writes: PlaybackWrite[]) =>
      Promise.resolve(
        options.outcome ?? { applied: writes.length, complete: true },
      ),
    );

  const devices = {
    claimPlaybackBatch,
    releasePlaybackBatch,
  } as unknown as DevicesRepository;
  const playback = { recordBatch } as unknown as PlaybackRepository;

  return {
    service: new PlaybackService(devices, playback),
    claimPlaybackBatch,
    releasePlaybackBatch,
    recordBatch,
    /** The rows handed to the repository by the last call. */
    written: (): PlaybackWrite[] =>
      (recordBatch.mock.calls[0]?.[0] as PlaybackWrite[] | undefined) ?? [],
  };
}

function batch(overrides: Partial<PlaybackBatch> = {}): PlaybackBatch {
  return {
    seq: 5,
    origin: 'counter-a',
    at: NOW,
    tallies: [
      {
        contentId: 'media-1',
        day: '2026-08-17',
        kind: 'image',
        plays: 12,
        airtimeMs: 180_000,
        hours: hoursAt(9, 12),
        airtimeHours: hoursAt(9, 180_000),
        firstAt: NOW - 3_600_000,
        lastAt: NOW - 60_000,
      },
    ],
    ...overrides,
  };
}

/** A 24-slot histogram with `count` plays in `hour`. */
function hoursAt(hour: number, count: number): number[] {
  const hours = new Array<number>(24).fill(0);
  hours[hour] = count;
  return hours;
}

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('PlaybackService', () => {
  it('records a batch and lets the device forget it', async () => {
    const { service, recordBatch, written } = buildService();

    await expect(service.record(SOURCE, batch())).resolves.toBe(true);

    expect(recordBatch).toHaveBeenCalledTimes(1);
    expect(written()).toHaveLength(1);
    expect(written()[0]).toMatchObject({
      contentId: 'media-1',
      day: '2026-08-17',
      kind: 'image',
      plays: 12,
      airtimeMs: 180_000,
      clockCorrected: false,
    });
    // Attribution comes from the socket, never from the payload.
    expect(written()[0]?.screenId.toString()).toBe(SCREEN_ID);
    expect(written()[0]?.organizationId.toString()).toBe(ORG_ID);
  });

  it('stores the histogram sparsely, keeping only hours that played', async () => {
    const { service, written } = buildService();
    await service.record(SOURCE, batch());
    expect(written()[0]?.hours).toEqual({ '9': 12 });
    expect(written()[0]?.airtime).toEqual({ '9': 180_000 });
  });

  it('will not let an hour claim more airtime than the whole day had', async () => {
    const { service, written } = buildService();
    await service.record(
      SOURCE,
      batch({
        tallies: [
          {
            ...batch().tallies[0],
            airtimeMs: 60_000,
            airtimeHours: hoursAt(9, 9_000_000),
          },
        ],
      }),
    );
    expect(written()[0]?.airtime).toEqual({ '9': 60_000 });
  });

  it('recognises a repeat and writes nothing', async () => {
    const { service, recordBatch } = buildService({ claimed: false });

    // The device is re-sending because our acknowledgement was lost, not because
    // anything new happened.
    await expect(service.record(SOURCE, batch())).resolves.toBe(true);

    expect(recordBatch).not.toHaveBeenCalled();
  });

  it('claims the batch before writing a single row', async () => {
    const order: string[] = [];
    const { service, claimPlaybackBatch, recordBatch } = buildService();
    claimPlaybackBatch.mockImplementation(() => {
      order.push('claim');
      return Promise.resolve({ accepted: true, previous: null });
    });
    recordBatch.mockImplementation((writes: PlaybackWrite[]) => {
      order.push('write');
      return Promise.resolve({ applied: writes.length, complete: true });
    });

    await service.record(SOURCE, batch());

    // The other order double-counts whenever the process dies in between.
    expect(order).toEqual(['claim', 'write']);
  });

  it('hands the batch back when nothing was written', async () => {
    const { service, releasePlaybackBatch } = buildService({
      outcome: { applied: 0, complete: false },
    });

    await expect(service.record(SOURCE, batch())).resolves.toBe(false);

    // The claim is released, so the retry is treated as new rather than as a
    // repeat that has already been counted.
    expect(releasePlaybackBatch).toHaveBeenCalledWith('dev-1', 'counter-a', 5, {
      origin: 'counter-a',
      seq: 4,
    });
  });

  it('keeps the claim when part of the batch landed', async () => {
    const { service, releasePlaybackBatch } = buildService({
      outcome: { applied: 1, complete: false },
    });

    // Acknowledged despite the shortfall: retrying would add the rows that
    // already landed a second time, and an invented play is worse than a lost one.
    await expect(service.record(SOURCE, batch())).resolves.toBe(true);
    expect(releasePlaybackBatch).not.toHaveBeenCalled();
  });

  it('accepts a batch from a counter that restarted', async () => {
    // Web storage was evicted; the device id survived in the native shell, so the
    // numbering begins again at 1 on a screen we already know.
    const { service, claimPlaybackBatch } = buildService();
    await service.record(SOURCE, batch({ seq: 1, origin: 'counter-b' }));
    expect(claimPlaybackBatch).toHaveBeenCalledWith('dev-1', 'counter-b', 1);
  });

  describe('when the device clock cannot be trusted', () => {
    it('keeps the reported day for an ordinary timezone offset', async () => {
      const { service, written } = buildService();
      // Twelve hours "off" is a screen in another timezone, not a broken clock.
      await service.record(SOURCE, batch({ at: NOW - 12 * 60 * 60 * 1000 }));
      expect(written()[0]).toMatchObject({
        day: '2026-08-17',
        clockCorrected: false,
      });
    });

    it('re-derives the day from the measured skew and says so', async () => {
      const { service, written } = buildService();
      // A box with no battery-backed clock, back from a power cut believing it is
      // three days ago. Its days are stamped from that belief.
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      await service.record(
        SOURCE,
        batch({
          at: NOW - threeDays,
          tallies: [
            {
              contentId: 'media-1',
              day: '2026-08-14',
              kind: 'image',
              plays: 3,
              airtimeMs: 45_000,
              hours: hoursAt(9, 3),
              airtimeHours: hoursAt(9, 45_000),
              firstAt: NOW - threeDays - 3_600_000,
              lastAt: NOW - threeDays - 60_000,
            },
          ],
        }),
      );

      expect(written()[0]).toMatchObject({
        day: '2026-08-17',
        clockCorrected: true,
      });
    });
  });

  describe('rejecting what cannot be recorded', () => {
    it('acknowledges a malformed batch rather than making the device keep it', async () => {
      const { service, claimPlaybackBatch, recordBatch } = buildService();

      await expect(
        service.record(SOURCE, { seq: 1 } as unknown as PlaybackBatch),
      ).resolves.toBe(true);

      expect(claimPlaybackBatch).not.toHaveBeenCalled();
      expect(recordBatch).not.toHaveBeenCalled();
    });

    it('drops rows that carry no usable content id', async () => {
      const { service, recordBatch } = buildService();
      await service.record(
        SOURCE,
        batch({
          tallies: [
            { ...batch().tallies[0], contentId: '  ' },
            { ...batch().tallies[0], contentId: 'x'.repeat(200) },
          ],
        }),
      );
      expect(recordBatch).not.toHaveBeenCalled();
    });

    it('drops a day too far in the future to be real', async () => {
      const { service, recordBatch } = buildService();
      await service.record(
        SOURCE,
        batch({
          tallies: [{ ...batch().tallies[0], day: '2027-01-01' }],
        }),
      );
      expect(recordBatch).not.toHaveBeenCalled();
    });

    it('caps counts that no screen could have produced', async () => {
      const { service, written } = buildService();
      await service.record(
        SOURCE,
        batch({
          tallies: [
            {
              ...batch().tallies[0],
              plays: 9_000_000,
              airtimeMs: 40 * 24 * 60 * 60 * 1000,
            },
          ],
        }),
      );

      expect(written()[0]?.plays).toBe(100_000);
      expect(written()[0]?.airtimeMs).toBe(30 * 60 * 60 * 1000);
    });

    it('ignores an unknown kind instead of storing it', async () => {
      const { service, written } = buildService();
      await service.record(
        SOURCE,
        batch({
          tallies: [{ ...batch().tallies[0], kind: 'hologram' as never }],
        }),
      );
      expect(written()[0]?.kind).toBeUndefined();
    });

    it('will not let one batch write an unbounded number of rows', async () => {
      const { service, written } = buildService();
      const many = Array.from({ length: 1500 }, (_, index) => ({
        ...batch().tallies[0],
        contentId: `media-${String(index)}`,
      }));

      await service.record(SOURCE, batch({ tallies: many }));

      expect(written()).toHaveLength(1000);
    });
  });
});
