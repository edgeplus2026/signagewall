import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Campaign, CampaignDocument } from './schemas/campaign.schema';

export interface CampaignData {
  name: string;
  startDate?: string;
  endDate?: string;
  contentIds?: string[];
}

@Injectable()
export class CampaignsRepository {
  constructor(
    @InjectModel(Campaign.name)
    private readonly model: Model<CampaignDocument>,
  ) {}

  findAll(organizationId: string): Promise<CampaignDocument[]> {
    return this.model
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ name: 1 })
      .exec();
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<CampaignDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return Promise.resolve(null);
    }
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  create(
    organizationId: string,
    data: CampaignData,
  ): Promise<CampaignDocument> {
    return this.model.create({
      organizationId: new Types.ObjectId(organizationId),
      name: data.name,
      ...(data.startDate ? { startDate: data.startDate } : {}),
      ...(data.endDate ? { endDate: data.endDate } : {}),
      contentIds: data.contentIds ?? [],
    });
  }

  update(
    organizationId: string,
    id: string,
    data: Partial<CampaignData>,
  ): Promise<CampaignDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return Promise.resolve(null);
    }
    return this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: data },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async delete(organizationId: string, id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.model
      .deleteOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
    return result.deletedCount > 0;
  }

  /**
   * Adds or removes one content item, without reading the campaign first.
   *
   * `$addToSet` rather than `$push` so assigning twice — two operators, or one
   * impatient double click — cannot make an item count twice in its own
   * campaign's totals.
   */
  async setMembership(
    organizationId: string,
    id: string,
    contentId: string,
    member: boolean,
  ): Promise<CampaignDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        member
          ? { $addToSet: { contentIds: contentId } }
          : { $pull: { contentIds: contentId } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Which campaign each content id belongs to.
   *
   * One indexed query for the whole report rather than one per row. An item in
   * two campaigns resolves to the first by name, which is stable — the
   * alternative, counting it under both, would make the shares add up to more
   * than the airtime that was actually sold.
   */
  async membershipMap(
    organizationId: string,
  ): Promise<Map<string, CampaignDocument>> {
    const campaigns = await this.findAll(organizationId);
    const map = new Map<string, CampaignDocument>();
    for (const campaign of campaigns) {
      for (const contentId of campaign.contentIds) {
        if (!map.has(contentId)) {
          map.set(contentId, campaign);
        }
      }
    }
    return map;
  }
}
