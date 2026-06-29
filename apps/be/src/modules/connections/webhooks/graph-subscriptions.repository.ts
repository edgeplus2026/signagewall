import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  GraphSubscription,
  GraphSubscriptionDocument,
} from '../schemas/graph-subscription.schema';

export interface CreateSubscriptionData {
  subscriptionId: string;
  connectionId: string;
  organizationId: string;
  resource: string;
  cacheKey: string;
  clientState: string;
  expiresAt: Date;
}

@Injectable()
export class GraphSubscriptionsRepository {
  constructor(
    @InjectModel(GraphSubscription.name)
    private readonly model: Model<GraphSubscriptionDocument>,
  ) {}

  async create(
    data: CreateSubscriptionData,
  ): Promise<GraphSubscriptionDocument> {
    return this.model.create({
      ...data,
      connectionId: new Types.ObjectId(data.connectionId),
      organizationId: new Types.ObjectId(data.organizationId),
    });
  }

  async findBySubscriptionId(
    subscriptionId: string,
  ): Promise<GraphSubscriptionDocument | null> {
    return this.model.findOne({ subscriptionId }).exec();
  }

  async findByCacheKey(
    cacheKey: string,
  ): Promise<GraphSubscriptionDocument | null> {
    return this.model.findOne({ cacheKey }).exec();
  }

  /** Subscriptions expiring at/before `before` (renewal candidates). */
  async findExpiringBefore(before: Date): Promise<GraphSubscriptionDocument[]> {
    return this.model.find({ expiresAt: { $lte: before } }).exec();
  }

  async updateExpiry(subscriptionId: string, expiresAt: Date): Promise<void> {
    await this.model.updateOne({ subscriptionId }, { $set: { expiresAt } });
  }

  async deleteBySubscriptionId(subscriptionId: string): Promise<void> {
    await this.model.deleteOne({ subscriptionId });
  }
}
