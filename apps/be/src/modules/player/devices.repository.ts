import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Device,
  DeviceDocument,
  DeviceProfile,
  DeviceSettings,
  DeviceStatus,
} from './schemas/device.schema';

/** The batch marker a device carried before the current claim. */
export interface PlaybackMarker {
  origin?: string;
  seq: number;
}

export interface PlaybackClaim {
  /** True only for the caller that may write this batch's rows. */
  accepted: boolean;
  previous: PlaybackMarker | null;
}

export interface PairDeviceData {
  screenId: string;
  organizationId: string;
  tokenHash: string;
}

@Injectable()
export class DevicesRepository {
  constructor(
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
  ) {}

  findByDeviceId(deviceId: string): Promise<DeviceDocument | null> {
    return this.deviceModel.findOne({ deviceId }).exec();
  }

  findByPairingCode(pairingCode: string): Promise<DeviceDocument | null> {
    return this.deviceModel.findOne({ pairingCode }).exec();
  }

  findByScreenId(screenId: string): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOne({ screenId: new Types.ObjectId(screenId) })
      .exec();
  }

  /** All paired devices in an organization — used to seed CMS presence. */
  findPairedByOrganization(organizationId: string): Promise<DeviceDocument[]> {
    return this.deviceModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        status: DeviceStatus.PAIRED,
      })
      .exec();
  }

  findByTokenHash(tokenHash: string): Promise<DeviceDocument | null> {
    return this.deviceModel.findOne({ tokenHash }).exec();
  }

  /** Creates the device on first contact, or refreshes its reported profile. */
  async upsert(
    deviceId: string,
    profile?: DeviceProfile,
  ): Promise<DeviceDocument> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        {
          $setOnInsert: { deviceId, status: DeviceStatus.UNPAIRED },
          ...(profile ? { $set: { profile } } : {}),
        },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async setPairingCode(
    deviceId: string,
    pairingCode: string,
    pairingCodeExpiresAt: Date,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        { $set: { pairingCode, pairingCodeExpiresAt } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async pair(
    deviceId: string,
    data: PairDeviceData,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        {
          $set: {
            status: DeviceStatus.PAIRED,
            screenId: new Types.ObjectId(data.screenId),
            organizationId: new Types.ObjectId(data.organizationId),
            tokenHash: data.tokenHash,
          },
          $unset: { pairingCode: '', pairingCodeExpiresAt: '' },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /** Reverts a device to unpaired, dropping its screen binding and token. */
  async unpair(deviceId: string): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        {
          $set: { status: DeviceStatus.UNPAIRED, online: false },
          $unset: { screenId: '', organizationId: '', tokenHash: '' },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async setVolume(
    deviceId: string,
    volume: number,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        { $set: { volume } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Patches one or more `settings.*` fields. Uses dot-paths so a partial update
   * (e.g. only orientation) never clobbers the sibling settings.
   */
  async setSettings(
    deviceId: string,
    partial: Partial<DeviceSettings>,
  ): Promise<DeviceDocument | null> {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      update[`settings.${key}`] = value;
    }

    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        { $set: update },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async setTokenHash(
    deviceId: string,
    tokenHash: string,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        { $set: { tokenHash } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /** Marks presence and returns the updated device (for downstream events). */
  /**
   * Stores the device's latest on-demand report, replacing any previous one.
   * Only the newest is kept: a history would grow without bound on a device
   * nobody is investigating, and the question this answers is always "what is
   * wrong with it now".
   */
  async setDiagnosticsReport(
    deviceId: string,
    report: Record<string, unknown>,
  ): Promise<void> {
    await this.deviceModel
      .updateOne({ deviceId }, { $set: { diagnosticsReport: report } })
      .exec();
  }

  /**
   * Records the shell's report and atomically takes whatever was queued for it.
   *
   * One findOneAndUpdate, not a read then a write: two operators clicking at the
   * same moment, or a device polling while one clicks, would otherwise let a
   * command be handed out twice or dropped between the read and the clear.
   * `returnDocument: 'before'` is what makes the take atomic — the caller gets
   * the queue as it was, and the same operation empties it.
   */
  async recordShellStatusAndTakeCommands(
    deviceId: string,
    status: Record<string, unknown>,
  ): Promise<{ commands: string[]; wantsLog: boolean }> {
    const previous = await this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        {
          $set: {
            shellStatus: status,
            shellStatusAt: new Date().toISOString(),
            shellCommands: [],
            shellWantsLog: false,
          },
        },
        { returnDocument: 'before' },
      )
      .exec();

    return {
      commands: previous?.shellCommands ?? [],
      wantsLog: previous?.shellWantsLog ?? false,
    };
  }

  /** Queues one command for the shell to collect on its next poll. */
  async queueShellCommand(deviceId: string, command: string): Promise<void> {
    await this.deviceModel
      .updateOne(
        { deviceId },
        // addToSet, not push: an impatient operator clicking restart four times
        // must not make the screen restart four times.
        { $addToSet: { shellCommands: command } },
      )
      .exec();
  }

  /** Asks the shell to include its event log in the next report. */
  async requestShellLog(deviceId: string): Promise<void> {
    await this.deviceModel
      .updateOne({ deviceId }, { $set: { shellWantsLog: true } })
      .exec();
  }

  async setPresence(
    deviceId: string,
    online: boolean,
    profile?: DeviceProfile,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        {
          $set: {
            online,
            lastSeenAt: new Date(),
            ...(profile ? { profile } : {}),
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Bumps only the liveness stamp, leaving the reported profile untouched.
   *
   * The heartbeat is the highest-frequency write in the system — one per device
   * every thirty seconds, forever — and it used to rewrite the whole `profile`
   * subdocument each time: the user agent, the update status, the diagnostics
   * block, all of it, for values that change perhaps once a week. At a thousand
   * screens that is a full-document rewrite plus index maintenance a hundred and
   * fifty times a second to record that nothing happened. The caller compares the
   * incoming profile against the stored one and only reaches for
   * {@link setPresence} when it actually differs.
   */
  async touchPresence(deviceId: string): Promise<void> {
    await this.deviceModel
      .updateOne(
        { deviceId },
        { $set: { online: true, lastSeenAt: new Date() } },
      )
      .exec();
  }

  /**
   * Claims a proof-of-play batch for recording, at most once.
   *
   * One conditional update decides it, so two backend instances handling the same
   * device cannot both conclude they were first. A batch is new when its number
   * is higher than the last one accepted, OR when it comes from a different
   * counter than the one on file — see `playbackOrigin` on the device schema for
   * why the second clause is not paranoia.
   *
   * Returns the previous marker as well, so a write that then fails outright can
   * put it back and let the device retry (see {@link releasePlaybackBatch}).
   */
  async claimPlaybackBatch(
    deviceId: string,
    origin: string,
    seq: number,
  ): Promise<PlaybackClaim> {
    const before = await this.deviceModel
      .findOneAndUpdate(
        {
          deviceId,
          $or: [
            { playbackOrigin: { $ne: origin } },
            { playbackSeq: { $exists: false } },
            { playbackSeq: { $lt: seq } },
          ],
        },
        { $set: { playbackOrigin: origin, playbackSeq: seq } },
        { returnDocument: 'before' },
      )
      .exec();

    if (!before) {
      return { accepted: false, previous: null };
    }

    return {
      accepted: true,
      previous:
        typeof before.playbackSeq === 'number'
          ? { origin: before.playbackOrigin, seq: before.playbackSeq }
          : null,
    };
  }

  /**
   * Puts the previous batch marker back after a write that recorded nothing.
   *
   * Conditional on the marker still being the one we set: a later batch may have
   * overtaken this one, and restoring over it would invite that newer batch to be
   * recorded a second time.
   */
  async releasePlaybackBatch(
    deviceId: string,
    origin: string,
    seq: number,
    previous: PlaybackMarker | null,
  ): Promise<void> {
    await this.deviceModel
      .updateOne(
        { deviceId, playbackOrigin: origin, playbackSeq: seq },
        previous
          ? {
              $set: {
                playbackSeq: previous.seq,
                ...(previous.origin ? { playbackOrigin: previous.origin } : {}),
              },
              ...(previous.origin ? {} : { $unset: { playbackOrigin: '' } }),
            }
          : { $unset: { playbackOrigin: '', playbackSeq: '' } },
      )
      .exec();
  }

  /**
   * Claims the one-time "this screen went live" marker.
   *
   * Returns true only for the caller that actually set it — the conditional
   * filter makes that atomic, so concurrent gateway instances cannot both decide
   * they were first. A device that already carries the marker costs one indexed
   * update that matches nothing, which is the cheapest honest answer available.
   */
  async claimActivationReport(deviceId: string): Promise<boolean> {
    const result = await this.deviceModel
      .updateOne(
        { deviceId, activationReportedAt: { $exists: false } },
        { $set: { activationReportedAt: new Date() } },
      )
      .exec();
    return result.modifiedCount > 0;
  }
}
