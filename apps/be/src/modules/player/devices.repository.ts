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

  /** Arms a fresh single-use recovery code, replacing any previous one. */
  async setRecoveryCode(
    deviceId: string,
    recoveryCodeHash: string,
    recoveryCodeExpiresAt: Date,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        { $set: { recoveryCodeHash, recoveryCodeExpiresAt } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Atomically redeems a recovery code: the matching, unexpired code is unset
   * in the same operation, so it can never be redeemed twice — even by
   * concurrent connections racing with the same URL.
   */
  async claimRecoveryCode(
    deviceId: string,
    recoveryCodeHash: string,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        {
          deviceId,
          recoveryCodeHash,
          recoveryCodeExpiresAt: { $gt: new Date() },
        },
        { $unset: { recoveryCodeHash: '', recoveryCodeExpiresAt: '' } },
        { returnDocument: 'after' },
      )
      .exec();
  }

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

  /** Marks presence and returns the updated device (for downstream events). */
  async setPresence(
    deviceId: string,
    online: boolean,
    profile?: DeviceProfile,
  ): Promise<DeviceDocument | null> {
    const now = new Date();

    if (!online) {
      return this.deviceModel
        .findOneAndUpdate(
          { deviceId },
          {
            $set: {
              online,
              lastSeenAt: now,
              ...(profile ? { profile } : {}),
            },
            $unset: { onlineSince: '' },
          },
          { returnDocument: 'after' },
        )
        .exec();
    }

    // Coming back online closes the offline episode and re-arms the alert —
    // but only once the device has PROVEN it is back. A flapping screen
    // (reconnecting for seconds at a time, then dropping) would otherwise
    // clear the stamp on every blip and re-alert on every sweep, turning one
    // bad display into a stream of emails. `onlineSince` records when the
    // current healthy streak began; the sweep's re-arm reads it.
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        [
          {
            $set: {
              online: true,
              lastSeenAt: now,
              ...(profile ? { profile } : {}),
              // Preserve an existing streak start; only stamp a new one when
              // the device was previously offline.
              onlineSince: {
                $cond: [
                  { $eq: ['$online', true] },
                  { $ifNull: ['$onlineSince', now] },
                  now,
                ],
              },
            },
          },
        ],
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Re-arms the offline alert for devices that have now been continuously
   * online for at least `stableFor`. Separating this from {@link setPresence}
   * is what makes the debounce hold: a device that flaps never accumulates a
   * long enough streak, so its `offlineAlertedAt` stamp survives and it is not
   * alerted again.
   */
  async rearmRecoveredDevices(stableSince: Date): Promise<number> {
    const result = await this.deviceModel
      .updateMany(
        {
          online: true,
          onlineSince: { $lte: stableSince },
          offlineAlertedAt: { $exists: true },
        },
        { $unset: { offlineAlertedAt: '' } },
      )
      .exec();
    return result.modifiedCount;
  }

  /**
   * Paired devices whose outage started between `notBefore` and `cutoff` and
   * that have not yet been alerted for this episode. Drives the offline-alert
   * sweep.
   *
   * `notBefore` is what keeps the FIRST sweep after a deploy sane: without it,
   * `offlineAlertedAt` being a new field means every device that has been dark
   * for weeks matches at once and the org gets one email listing screens it
   * retired months ago. `limit` bounds a genuine mass outage.
   */
  findOfflineForAlert(
    cutoff: Date,
    notBefore: Date,
    limit: number,
  ): Promise<DeviceDocument[]> {
    return (
      this.deviceModel
        .find({
          status: DeviceStatus.PAIRED,
          online: false,
          lastSeenAt: { $gt: notBefore, $lte: cutoff },
          offlineAlertedAt: { $exists: false },
          screenId: { $exists: true },
          organizationId: { $exists: true },
        })
        // Most recently lost first: if the limit truncates, it keeps the
        // outages an operator can still act on.
        .sort({ lastSeenAt: -1 })
        .limit(limit)
        .exec()
    );
  }

  /**
   * Stamps the alert BEFORE the email goes out (at-most-once): a crash between
   * stamp and send loses one email, while stamping after a send could double-
   * alert every screen on a retry — the worse failure for an inbox.
   */
  async markOfflineAlerted(deviceIds: string[]): Promise<void> {
    if (deviceIds.length === 0) {
      return;
    }
    await this.deviceModel
      .updateMany(
        { deviceId: { $in: deviceIds } },
        { $set: { offlineAlertedAt: new Date() } },
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
