import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  AppConnection,
  AppConnectionDocument,
  ConnectionProvider,
} from './schemas/app-connection.schema';

export interface CreateConnectionData {
  organizationId: string;
  provider: ConnectionProvider;
  accountLabel: string;
  scopes: string[];
  accessTokenEnc: string;
  refreshTokenEnc?: string;
  expiresAt?: Date;
  createdBy?: string;
}

export interface RefreshedTokenData {
  accessTokenEnc: string;
  refreshTokenEnc?: string;
  expiresAt?: Date;
}

@Injectable()
export class ConnectionsRepository {
  constructor(
    @InjectModel(AppConnection.name)
    private readonly model: Model<AppConnectionDocument>,
  ) {}

  async findByOrganization(
    organizationId: string,
  ): Promise<AppConnectionDocument[]> {
    return this.model
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ updatedAt: -1 })
      .exec();
  }

  /** Org-scoped lookup; null for a missing/foreign id. */
  async findById(
    organizationId: string,
    id: string,
  ): Promise<AppConnectionDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  /** Cross-org lookup by id (for the scheduler/webhook, which run globally). */
  async findByIdUnscoped(id: string): Promise<AppConnectionDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  /**
   * Upsert a connection for (org, provider, accountLabel) — reconnecting the
   * same account replaces its tokens rather than creating duplicates.
   */
  async upsert(data: CreateConnectionData): Promise<AppConnectionDocument> {
    return this.model.findOneAndUpdate(
      {
        organizationId: new Types.ObjectId(data.organizationId),
        provider: data.provider,
        accountLabel: data.accountLabel,
      },
      {
        $set: {
          scopes: data.scopes,
          accessTokenEnc: data.accessTokenEnc,
          ...(data.refreshTokenEnc
            ? { refreshTokenEnc: data.refreshTokenEnc }
            : {}),
          ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
          ...(data.createdBy
            ? { createdBy: new Types.ObjectId(data.createdBy) }
            : {}),
        },
      },
      { new: true, upsert: true },
    );
  }

  /** Persist refreshed access (and optionally refresh) tokens for a connection. */
  async updateTokens(id: string, data: RefreshedTokenData): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(id) },
      {
        $set: {
          accessTokenEnc: data.accessTokenEnc,
          ...(data.refreshTokenEnc
            ? { refreshTokenEnc: data.refreshTokenEnc }
            : {}),
          ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
        },
      },
    );
  }

  async deleteById(organizationId: string, id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.model.deleteOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });
    return result.deletedCount > 0;
  }
}
