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
        { new: true, upsert: true, setDefaultsOnInsert: true },
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
        { new: true },
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
        { new: true },
      )
      .exec();
  }

  /** Reverts a device to unpaired, dropping its screen binding and token. */
  async unpair(deviceId: string): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        {
          // Clear any open alert incident too, so unpairing never leaves a
          // dangling recovery to fire on a future re-pair.
          $set: {
            status: DeviceStatus.UNPAIRED,
            online: false,
            offlineAlertActive: false,
          },
          $unset: {
            screenId: '',
            organizationId: '',
            tokenHash: '',
            offlineSince: '',
          },
        },
        { new: true },
      )
      .exec();
  }

  async setVolume(
    deviceId: string,
    volume: number,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate({ deviceId }, { $set: { volume } }, { new: true })
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
      .findOneAndUpdate({ deviceId }, { $set: update }, { new: true })
      .exec();
  }

  async setTokenHash(
    deviceId: string,
    tokenHash: string,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate({ deviceId }, { $set: { tokenHash } }, { new: true })
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
        },
        { new: true },
      )
      .exec();
  }

  // --- Offline-alert state ---------------------------------------------------

  /**
   * Paired devices that are offline and have no open alert incident yet. The
   * caller applies the per-org threshold / mute / availability checks; this only
   * narrows the candidate set the sweep has to evaluate.
   */
  findOfflineNotAlerted(): Promise<DeviceDocument[]> {
    return this.deviceModel
      .find({
        status: DeviceStatus.PAIRED,
        online: false,
        offlineAlertActive: { $ne: true },
        lastSeenAt: { $exists: true },
      })
      .exec();
  }

  /**
   * Atomically opens an offline-alert incident. Returns the device only if this
   * call won the claim (no incident was already open), so concurrent/overlapping
   * sweeps and multiple BE instances each fire at most one alert per incident.
   * The `online: false` guard makes the claim fail for a device that reconnected
   * during the sweep (between `findOfflineNotAlerted` and here), so a back-online
   * device is never given a spurious offline alert / permanently-stuck incident.
   */
  claimOfflineAlert(
    deviceId: string,
    offlineSince: Date,
    now: Date,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId, online: false, offlineAlertActive: { $ne: true } },
        {
          $set: {
            offlineAlertActive: true,
            lastOfflineAlertAt: now,
            offlineSince,
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Atomically closes an open offline-alert incident. Returns the device only if
   * this call won the clear (an incident was open), so recovery fires once.
   */
  clearOfflineAlert(deviceId: string): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOneAndUpdate(
        { deviceId, offlineAlertActive: true },
        { $set: { offlineAlertActive: false }, $unset: { offlineSince: '' } },
        { new: false },
      )
      .exec();
  }
}
