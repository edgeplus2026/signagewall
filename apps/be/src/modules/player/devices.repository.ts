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
        { returnDocument: 'after' },
      )
      .exec();
  }
}
