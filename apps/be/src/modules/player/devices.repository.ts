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

  /** Marks presence and returns the updated device (for downstream events). */
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
          // Coming back online closes the offline episode, re-arming the
          // offline alert for the next outage.
          ...(online ? { $unset: { offlineAlertedAt: '' } } : {}),
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Paired devices that have been offline since before `cutoff` and have not
   * yet been alerted for this episode. Drives the offline-alert sweep.
   */
  findOfflineForAlert(cutoff: Date): Promise<DeviceDocument[]> {
    return this.deviceModel
      .find({
        status: DeviceStatus.PAIRED,
        online: false,
        lastSeenAt: { $lte: cutoff },
        offlineAlertedAt: { $exists: false },
        screenId: { $exists: true },
        organizationId: { $exists: true },
      })
      .exec();
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
}
