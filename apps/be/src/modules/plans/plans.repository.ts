import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  UpgradeRequest,
  UpgradeRequestDocument,
} from './schemas/upgrade-request.schema';

export interface UpgradeRequestWithUser {
  request: UpgradeRequestDocument;
  user: { id: string; name: string; email: string } | null;
}

@Injectable()
export class PlansRepository {
  constructor(
    @InjectModel(UpgradeRequest.name)
    private readonly upgradeRequestModel: Model<UpgradeRequestDocument>,
  ) {}

  async createRequest(
    data: Partial<UpgradeRequest>,
  ): Promise<UpgradeRequestDocument> {
    const [request] = await this.upgradeRequestModel.create([data]);
    return request;
  }

  findOpenRequestForUser(
    userId: string,
  ): Promise<UpgradeRequestDocument | null> {
    return this.upgradeRequestModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'open' })
      .sort({ createdAt: -1 })
      .exec();
  }

  findById(requestId: string): Promise<UpgradeRequestDocument | null> {
    return this.upgradeRequestModel.findById(requestId).exec();
  }

  /** Admin queue: open requests first, newest first within each group. */
  async findPaginated(params: {
    page: number;
    limit: number;
    status?: 'open' | 'resolved';
  }): Promise<{ requests: UpgradeRequestDocument[]; total: number }> {
    const filter = params.status ? { status: params.status } : {};
    const skip = (params.page - 1) * params.limit;

    const [requests, total] = await Promise.all([
      this.upgradeRequestModel
        .find(filter)
        .sort({ status: 1, createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .exec(),
      this.upgradeRequestModel.countDocuments(filter).exec(),
    ]);

    return { requests, total };
  }

  countOpen(): Promise<number> {
    return this.upgradeRequestModel.countDocuments({ status: 'open' }).exec();
  }

  /** Billing reminder input: open asks that still need an invoice workflow. */
  findOpen(): Promise<UpgradeRequestDocument[]> {
    return this.upgradeRequestModel
      .find({ status: 'open' })
      .sort({ createdAt: 1, _id: 1 })
      .exec();
  }

  resolve(
    requestId: string,
    resolvedBy: string,
  ): Promise<UpgradeRequestDocument | null> {
    return this.upgradeRequestModel
      .findByIdAndUpdate(
        requestId,
        {
          status: 'resolved',
          resolvedBy: new Types.ObjectId(resolvedBy),
          resolvedAt: new Date(),
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /** Called when a super-admin raises a plan: the ask has been answered. */
  async resolveOpenForUser(userId: string, resolvedBy: string): Promise<void> {
    await this.upgradeRequestModel
      .updateMany(
        { userId: new Types.ObjectId(userId), status: 'open' },
        {
          status: 'resolved',
          resolvedBy: new Types.ObjectId(resolvedBy),
          resolvedAt: new Date(),
        },
      )
      .exec();
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.upgradeRequestModel
      .deleteMany({ userId: new Types.ObjectId(userId) })
      .exec();
  }
}
