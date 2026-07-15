import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import type { LegalDocType } from './legal.constants';
import {
  LegalAcceptance,
  LegalAcceptanceDocument,
} from './schemas/legal-acceptance.schema';

@Injectable()
export class LegalRepository {
  constructor(
    @InjectModel(LegalAcceptance.name)
    private readonly acceptanceModel: Model<LegalAcceptanceDocument>,
  ) {}

  async create(
    data: {
      userId: string;
      docType: LegalDocType;
      version: string;
      ip?: string;
    },
    session?: ClientSession,
  ): Promise<void> {
    await this.acceptanceModel.create(
      [
        {
          userId: new Types.ObjectId(data.userId),
          docType: data.docType,
          version: data.version,
          acceptedAt: new Date(),
          ...(data.ip ? { ip: data.ip } : {}),
        },
      ],
      session ? { session } : {},
    );
  }

  /** The most-recently accepted version per docType for a user. */
  async latestVersionsByDocType(
    userId: string,
  ): Promise<Record<string, string>> {
    const rows = await this.acceptanceModel
      .aggregate<{ _id: string; version: string }>([
        { $match: { userId: new Types.ObjectId(userId) } },
        { $sort: { acceptedAt: -1 } },
        {
          $group: {
            _id: '$docType',
            version: { $first: '$version' },
          },
        },
      ])
      .exec();

    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row._id] = row.version;
      return acc;
    }, {});
  }

  /** All acceptance rows for a user (for GDPR data export). */
  findByUser(userId: string): Promise<LegalAcceptanceDocument[]> {
    return this.acceptanceModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ acceptedAt: -1 })
      .exec();
  }

  async deleteByUser(userId: string, session?: ClientSession): Promise<void> {
    await this.acceptanceModel
      .deleteMany(
        { userId: new Types.ObjectId(userId) },
        session ? { session } : {},
      )
      .exec();
  }
}
