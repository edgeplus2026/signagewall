import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import type { AppInstanceConfig } from '@edge/apps-contract';

import {
  AppInstance,
  AppInstanceDocument,
} from './schemas/app-instance.schema';

export interface CreateInstanceData {
  organizationId: string;
  appId: string;
  appSlug: string;
  name: string;
  config: AppInstanceConfig;
  configVersion: number;
}

@Injectable()
export class AppInstancesRepository {
  constructor(
    @InjectModel(AppInstance.name)
    private readonly model: Model<AppInstanceDocument>,
  ) {}

  async findByOrganization(
    organizationId: string,
    appId?: string,
  ): Promise<AppInstanceDocument[]> {
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (appId && Types.ObjectId.isValid(appId)) {
      filter.appId = new Types.ObjectId(appId);
    }
    return this.model.find(filter).sort({ updatedAt: -1 }).exec();
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<AppInstanceDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  /** Batch lookup scoped to the org (used when resolving screen content). */
  async findByIds(
    organizationId: string,
    ids: string[],
  ): Promise<AppInstanceDocument[]> {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (objectIds.length === 0) {
      return [];
    }

    return this.model
      .find({
        _id: { $in: objectIds },
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  /**
   * Cross-org lookup of every instance of the given app slugs. Used by the
   * connector scheduler and the realtime fan-out, which operate globally (the
   * connector cache is shared across organizations); each returned instance
   * still carries its `organizationId` so downstream pushes stay org-correct.
   */
  async findBySlugs(slugs: string[]): Promise<AppInstanceDocument[]> {
    const uniqueSlugs = [...new Set(slugs)];
    if (uniqueSlugs.length === 0) {
      return [];
    }
    return this.model.find({ appSlug: { $in: uniqueSlugs } }).exec();
  }

  async countForApp(organizationId: string, appId: string): Promise<number> {
    return this.model
      .countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        appId: new Types.ObjectId(appId),
      })
      .exec();
  }

  async create(data: CreateInstanceData): Promise<AppInstanceDocument> {
    const [instance] = await this.model.create([
      {
        organizationId: new Types.ObjectId(data.organizationId),
        appId: new Types.ObjectId(data.appId),
        appSlug: data.appSlug,
        name: data.name,
        config: data.config,
        configVersion: data.configVersion,
      },
    ]);
    return instance;
  }

  async updateById(
    organizationId: string,
    id: string,
    data: Partial<Pick<AppInstance, 'name' | 'config' | 'configVersion'>>,
  ): Promise<AppInstanceDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: data },
        { new: true },
      )
      .exec();
  }

  async deleteById(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const query = this.model.deleteOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });
    if (session) {
      query.session(session);
    }
    const result = await query.exec();
    return result.deletedCount > 0;
  }

  /** All instances of an app for an org (used to cascade-clean on uninstall). */
  async findByApp(
    organizationId: string,
    appId: string,
  ): Promise<AppInstanceDocument[]> {
    if (!Types.ObjectId.isValid(appId)) return [];
    return this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        appId: new Types.ObjectId(appId),
      })
      .exec();
  }

  /** Remove all instances of an app for an org (used when uninstalling). */
  async deleteByApp(
    organizationId: string,
    appId: string,
    session?: ClientSession,
  ): Promise<number> {
    if (!Types.ObjectId.isValid(appId)) return 0;
    const query = this.model.deleteMany({
      organizationId: new Types.ObjectId(organizationId),
      appId: new Types.ObjectId(appId),
    });
    if (session) {
      query.session(session);
    }
    const result = await query.exec();
    return result.deletedCount;
  }
}
