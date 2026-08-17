import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';

import type { PlaybackBatch } from '@signagewall/player-contract';

import { DevicesRepository } from './devices.repository';
import { PlaybackRepository, PlaybackWrite } from './playback.repository';

/** Who sent the batch, resolved from the socket rather than trusted from it. */
export interface PlaybackSource {
  deviceId: string;
  screenId: string;
  organizationId: string;
}

/**
 * Most tallies one batch may carry.
 *
 * A screen reporting every five minutes sends tens of rows; a screen back from a
 * fortnight offline sends a few hundred. A thousand means either something is
 * wrong on the device or nothing good is being asked of the database, and the
 * player caps its own tally map at the same number.
 */
const MAX_TALLIES = 1000;

/**
 * How far the device's clock may be off before its calendar days stop being
 * trusted.
 *
 * Twenty-six hours, not one: `day` is stamped in the device's LOCAL time and the
 * backend does not know the timezone, so a screen in Auckland legitimately looks
 * up to fourteen hours "off" from a server in Europe. Anything past a full day
 * plus that margin is not a timezone, it is a wrong clock.
 */
const CLOCK_TRUST_WINDOW_MS = 26 * 60 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** A day this far ahead of the server cannot be real. */
const MAX_FUTURE_DAYS = 2;
/** Older than this is a clock that never recovered, not a screen catching up. */
const MAX_PAST_DAYS = 400;

/** One item cannot plausibly play more than this in a day (≈ 1/second). */
const MAX_PLAYS_PER_DAY = 100_000;
/** Nor be on screen longer than a generous day. */
const MAX_AIRTIME_PER_DAY_MS = 30 * 60 * 60 * 1000;

const KINDS = new Set(['image', 'video', 'app']);
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Takes what a screen says it played and records it once.
 *
 * Delivery is at-least-once — a lost acknowledgement is indistinguishable from a
 * lost batch, so the device re-sends — which makes "once" this service's job
 * rather than the network's. It is done with a per-device batch marker claimed
 * atomically: the first claimant writes the buckets, and a repeat is recognised
 * and answered without touching them.
 *
 * The bias throughout is toward losing a batch over inventing one. Missing plays
 * look like a quiet screen and are visible as such; invented plays look like
 * fraud, and nothing downstream can tell they were invented.
 */
@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);

  constructor(
    private readonly devices: DevicesRepository,
    private readonly playback: PlaybackRepository,
  ) {}

  /**
   * Records a batch, and answers whether the device may forget it.
   *
   * Returning true is a promise that the plays are durably stored — or were
   * already, on an earlier delivery of the same batch. Anything else must return
   * false, because the device drops the batch the moment it hears otherwise.
   */
  async record(source: PlaybackSource, batch: PlaybackBatch): Promise<boolean> {
    if (
      !batch ||
      typeof batch.seq !== 'number' ||
      !Number.isFinite(batch.seq) ||
      typeof batch.origin !== 'string' ||
      batch.origin.length === 0 ||
      batch.origin.length > 100 ||
      !Array.isArray(batch.tallies)
    ) {
      // Unusable, and re-sending will not make it usable. Acknowledge so the
      // device stops carrying it forever.
      this.logger.warn(`Discarding malformed playback from ${source.deviceId}`);
      return true;
    }

    const writes = this.normalise(source, batch);
    if (writes.length === 0) {
      return true;
    }

    // Claim before writing. The other order — write, then claim — double-counts
    // whenever the process dies in between, and a repeat that got counted twice
    // cannot be found afterwards, whereas one that was dropped is at least
    // consistent with what the device still holds.
    const claim = await this.devices.claimPlaybackBatch(
      source.deviceId,
      batch.origin,
      batch.seq,
    );

    if (!claim.accepted) {
      // Already recorded on an earlier delivery. Saying so is what lets the
      // device let go of a batch whose acknowledgement was lost in transit.
      return true;
    }

    const outcome = await this.playback.recordBatch(writes);

    if (outcome.complete) {
      return true;
    }

    if (outcome.applied === 0) {
      // Nothing landed, so the batch is safe to hand back: release the claim and
      // the device's next attempt is treated as new rather than as a repeat.
      await this.devices.releasePlaybackBatch(
        source.deviceId,
        batch.origin,
        batch.seq,
        claim.previous,
      );
      return false;
    }

    // Part of it landed. Releasing the claim now would re-apply those rows on the
    // retry, so the claim stands and the shortfall is logged instead — the one
    // case where a few plays are knowingly lost, and the only alternative was to
    // knowingly invent some.
    this.logger.error(
      `Playback batch ${String(batch.seq)} from ${source.deviceId} applied ` +
        `${String(outcome.applied)}/${String(writes.length)} rows; the remainder is lost`,
    );
    return true;
  }

  /**
   * Turns a device's report into rows that can be trusted.
   *
   * Everything here arrives from a player that may be older than this backend and
   * has been running unattended on hardware with no battery-backed clock, so
   * every field is checked and clamped rather than believed. A row that cannot be
   * made sense of is dropped; a row that is merely extreme is capped, because a
   * plausible-but-wrong number is harder to notice than a missing one.
   */
  private normalise(
    source: PlaybackSource,
    batch: PlaybackBatch,
  ): PlaybackWrite[] {
    const now = Date.now();
    // How far behind the server this device's clock is running. A screen that
    // came back from a power cut believing it is 1970 stamps its days from that
    // belief, and this is the only evidence of it we get.
    const skewMs =
      typeof batch.at === 'number' && Number.isFinite(batch.at) && batch.at > 0
        ? now - batch.at
        : 0;
    const clockTrusted = Math.abs(skewMs) <= CLOCK_TRUST_WINDOW_MS;

    const organizationId = new Types.ObjectId(source.organizationId);
    const screenId = new Types.ObjectId(source.screenId);
    const writes: PlaybackWrite[] = [];

    for (const tally of batch.tallies.slice(0, MAX_TALLIES)) {
      if (typeof tally !== 'object') {
        continue;
      }
      const contentId =
        typeof tally.contentId === 'string' ? tally.contentId.trim() : '';
      if (contentId.length === 0 || contentId.length > 64) {
        continue;
      }

      const plays = clamp(tally.plays, 1, MAX_PLAYS_PER_DAY);
      if (plays === null) {
        continue;
      }
      const airtimeMs = clamp(tally.airtimeMs, 0, MAX_AIRTIME_PER_DAY_MS) ?? 0;

      const firstAt =
        timestamp(tally.firstAt, now) + (clockTrusted ? 0 : skewMs);
      const lastAt = timestamp(tally.lastAt, now) + (clockTrusted ? 0 : skewMs);

      const day = clockTrusted
        ? typeof tally.day === 'string' && DAY_PATTERN.test(tally.day)
          ? tally.day
          : utcDay(firstAt)
        : // The reported day was stamped by a clock we have just established is
          // wrong. Re-derive it from the corrected instant instead — in UTC,
          // since the device's timezone is unknowable from here — and mark the
          // row, rather than filing real playback under 1970 or hiding that the
          // date is an inference.
          utcDay(firstAt);

      const age = (now - Date.parse(`${day}T00:00:00.000Z`)) / MS_PER_DAY;
      if (age < -MAX_FUTURE_DAYS || age > MAX_PAST_DAYS) {
        continue;
      }

      writes.push({
        organizationId,
        screenId,
        contentId,
        day,
        ...(typeof tally.kind === 'string' && KINDS.has(tally.kind)
          ? { kind: tally.kind }
          : {}),
        ...(typeof tally.slug === 'string' && tally.slug.length <= 64
          ? { slug: tally.slug }
          : {}),
        plays,
        airtimeMs,
        hours: hourMap(tally.hours, 1, MAX_PLAYS_PER_DAY),
        // Bounded by the airtime of the whole row, so a broken histogram cannot
        // report more time in one hour than the day's total.
        airtime: hourMap(tally.airtimeHours, 1, airtimeMs),
        firstAt: new Date(Math.min(firstAt, lastAt)),
        lastAt: new Date(Math.max(firstAt, lastAt)),
        clockCorrected: !clockTrusted,
      });
    }

    return writes;
  }
}

/** A finite number inside bounds, or null when it is not a usable count. */
function clamp(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  if (rounded < min) {
    return null;
  }
  return Math.min(rounded, max);
}

/** A usable epoch millisecond, falling back to now. */
function timestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

/** 'YYYY-MM-DD' in UTC. Only used when the device's own day cannot be trusted. */
function utcDay(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

/**
 * A reported histogram as a sparse map of hour → value.
 *
 * Zero hours are dropped: a screen is dark for a good part of the day, and
 * storing two dozen zeros per row per day across a fleet is most of the
 * collection for none of the information.
 */
function hourMap(
  value: unknown,
  min: number,
  max: number,
): Record<string, number> {
  if (!Array.isArray(value)) {
    return {};
  }
  const hours: Record<string, number> = {};
  for (let hour = 0; hour < 24; hour += 1) {
    const count = clamp(value[hour], min, max);
    if (count !== null) {
      hours[String(hour)] = count;
    }
  }
  return hours;
}
