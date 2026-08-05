import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CrmLead,
  CrmLeadDocument,
  CrmLeadEmailStatus,
  CrmLeadStatus,
  CrmLeadType,
} from './schemas/crm-lead.schema';

@Injectable()
export class CrmRepository {
  constructor(
    @InjectModel(CrmLead.name)
    private readonly model: Model<CrmLeadDocument>,
  ) {}

  findBySubmissionId(submissionId: string): Promise<CrmLeadDocument | null> {
    return this.model.findOne({ submissionId }).exec();
  }

  create(data: Partial<CrmLead>): Promise<CrmLeadDocument> {
    return this.model.create(data);
  }

  findById(id: string): Promise<CrmLeadDocument | null> {
    return this.model
      .findOne({ _id: new Types.ObjectId(id), archivedAt: null })
      .exec();
  }

  async list(params: {
    page: number;
    limit: number;
    status?: CrmLeadStatus;
    type?: CrmLeadType;
    search?: string;
  }): Promise<{ items: CrmLeadDocument[]; total: number }> {
    const search = params.search?.trim();
    const escaped = search?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = {
      archivedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(escaped
        ? {
            $or: [
              { name: { $regex: escaped, $options: 'i' } },
              { email: { $regex: escaped, $options: 'i' } },
              { company: { $regex: escaped, $options: 'i' } },
            ],
          }
        : {}),
    };
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(params.limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  statusCounts(): Promise<Array<{ _id: CrmLeadStatus; count: number }>> {
    return this.model
      .aggregate<{
        _id: CrmLeadStatus;
        count: number;
      }>([
        { $match: { archivedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();
  }

  update(
    id: string,
    actorUserId: string,
    data: { status?: CrmLeadStatus; note?: string },
  ): Promise<CrmLeadDocument | null> {
    const now = new Date();
    const pushes: Record<string, unknown> = {};
    if (data.status) {
      pushes.statusHistory = {
        status: data.status,
        actorUserId: new Types.ObjectId(actorUserId),
        occurredAt: now,
      };
    }
    if (data.note) {
      pushes.internalNotes = {
        actorUserId: new Types.ObjectId(actorUserId),
        text: data.note.trim(),
        createdAt: now,
      };
    }

    return this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), archivedAt: null },
        {
          ...(data.status ? { $set: { status: data.status } } : {}),
          ...(Object.keys(pushes).length ? { $push: pushes } : {}),
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  updateEmailStatus(
    id: string,
    status: CrmLeadEmailStatus,
  ): Promise<CrmLeadDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          emailNotificationStatus: status,
          emailNotificationAt: new Date(),
        },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
