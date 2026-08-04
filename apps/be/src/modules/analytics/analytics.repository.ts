import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  FunnelEvent,
  FunnelEventDocument,
  FunnelEventName,
} from './schemas/funnel-event.schema';

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectModel(FunnelEvent.name)
    private readonly model: Model<FunnelEventDocument>,
  ) {}

  async create(
    data: Partial<FunnelEvent>,
  ): Promise<FunnelEventDocument | null> {
    try {
      return await this.model.create(data);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return null;
      throw error;
    }
  }

  findLatestForIdentity(params: {
    userId?: string;
    anonymousId?: string;
  }): Promise<FunnelEventDocument | null> {
    const identities: Array<Record<string, unknown>> = [];
    if (params.userId)
      identities.push({ userId: new Types.ObjectId(params.userId) });
    if (params.anonymousId)
      identities.push({ anonymousId: params.anonymousId });
    if (!identities.length) return Promise.resolve(null);

    return this.model
      .findOne({ $or: identities })
      .sort({ occurredAt: -1, _id: -1 })
      .exec();
  }

  async overview(params: { from: Date; to: Date; recentLimit: number }) {
    const dateFilter = {
      occurredAt: { $gte: params.from, $lte: params.to },
    };
    const [counts, acquisitions, recent] = await Promise.all([
      this.model.aggregate<{ _id: FunnelEventName; count: number }>([
        { $match: dateFilter },
        { $group: { _id: '$eventName', count: { $sum: 1 } } },
      ]),
      this.model.aggregate<{
        eventName: FunnelEventName;
        source: string;
        medium: string;
        campaign: string;
        count: number;
      }>([
        {
          $match: {
            ...dateFilter,
            eventName: {
              $in: [FunnelEventName.SIGN_UP, FunnelEventName.PURCHASE],
            },
          },
        },
        {
          $group: {
            _id: {
              eventName: '$eventName',
              source: { $ifNull: ['$firstTouch.source', 'direct'] },
              medium: { $ifNull: ['$firstTouch.medium', 'none'] },
              campaign: { $ifNull: ['$firstTouch.campaign', 'uncategorized'] },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            eventName: '$_id.eventName',
            source: '$_id.source',
            medium: '$_id.medium',
            campaign: '$_id.campaign',
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 100 },
      ]),
      this.model
        .find(dateFilter)
        .sort({ occurredAt: -1, _id: -1 })
        .limit(params.recentLimit)
        .select('-updatedAt -__v')
        .lean()
        .exec(),
    ]);

    return { counts, acquisitions, recent };
  }
}
