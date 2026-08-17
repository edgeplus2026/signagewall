import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { OrgApp, OrgAppDocument } from './schemas/org-app.schema';

@Injectable()
export class OrgAppsRepository {
  constructor(
    @InjectModel(OrgApp.name)
    private readonly model: Model<OrgAppDocument>,
  ) {}

  /** Installed app ids (as strings) for an organization. */
  async findInstalledAppIds(organizationId: string): Promise<string[]> {
    const docs = await this.model
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .select({ appId: 1 })
      .exec();
    return docs.map((doc) => doc.appId.toString());
  }

  /**
   * Install count per app across all organizations, keyed by app id. Each
   * OrgApp doc is one org's install, so this counts installing organizations.
   */
  async countInstallsByApp(): Promise<Map<string, number>> {
    const rows = await this.model
      .aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([{ $group: { _id: '$appId', count: { $sum: 1 } } }])
      .exec();
    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }

  async isInstalled(organizationId: string, appId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(appId)) return false;
    const count = await this.model
      .countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        appId: new Types.ObjectId(appId),
      })
      .exec();
    return count > 0;
  }

  async install(
    organizationId: string,
    appId: string,
    installedBy?: string,
  ): Promise<void> {
    await this.model
      .updateOne(
        {
          organizationId: new Types.ObjectId(organizationId),
          appId: new Types.ObjectId(appId),
        },
        {
          $setOnInsert: {
            ...(installedBy
              ? { installedBy: new Types.ObjectId(installedBy) }
              : {}),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  /** Every organization's install record for one app — the admin grant list. */
  async findInstallsForApp(appId: string): Promise<OrgAppDocument[]> {
    if (!Types.ObjectId.isValid(appId)) return [];
    return this.model
      .find({ appId: new Types.ObjectId(appId) })
      .sort({ createdAt: 1, _id: 1 })
      .exec();
  }

  async uninstall(organizationId: string, appId: string): Promise<void> {
    if (!Types.ObjectId.isValid(appId)) return;
    await this.model
      .deleteOne({
        organizationId: new Types.ObjectId(organizationId),
        appId: new Types.ObjectId(appId),
      })
      .exec();
  }
}
