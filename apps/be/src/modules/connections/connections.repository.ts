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
  instanceId: string;
  provider: ConnectionProvider;
  accountLabel: string;
  /** The provider's own account id, when the adapter surfaced one. */
  providerAccountId?: string;
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
   * Every connection that can be proactively refreshed — one with a stored
   * refresh mechanism and a known expiry. Global (cross-org); used by the
   * proactive refresh scheduler so an idle connection's session never lapses
   * (critical for the always-live-sync apps, and for Meta tokens that must be
   * re-extended before their ~60-day window closes even when never fetched).
   */
  async findRefreshable(): Promise<AppConnectionDocument[]> {
    return this.model
      .find({
        refreshTokenEnc: { $exists: true, $ne: null },
        expiresAt: { $exists: true, $ne: null },
      })
      .exec();
  }

  /**
   * Upsert the connection OWNED BY an instance — reconnecting (even to a
   * different account) replaces that instance's tokens/label rather than
   * creating duplicates. One connection per instance (unique index).
   */
  async upsertByInstance(
    data: CreateConnectionData,
  ): Promise<AppConnectionDocument> {
    return this.model.findOneAndUpdate(
      {
        organizationId: new Types.ObjectId(data.organizationId),
        instanceId: new Types.ObjectId(data.instanceId),
      },
      {
        $set: {
          provider: data.provider,
          accountLabel: data.accountLabel,
          ...(data.providerAccountId
            ? { providerAccountId: data.providerAccountId }
            : {}),
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
        $setOnInsert: {
          organizationId: new Types.ObjectId(data.organizationId),
          instanceId: new Types.ObjectId(data.instanceId),
        },
        // A reconnect replaces the account credential set. Do not retain a
        // refresh token or expiry belonging to the previously connected
        // account when the new OAuth response omits either field.
        ...(!data.refreshTokenEnc || !data.expiresAt || !data.providerAccountId
          ? {
              $unset: {
                ...(!data.refreshTokenEnc ? { refreshTokenEnc: 1 } : {}),
                ...(!data.expiresAt ? { expiresAt: 1 } : {}),
                // Reconnecting to a DIFFERENT account must not leave the
                // previous account's id behind: a later deauthorize callback
                // would then tear down a connection that is no longer theirs.
                ...(!data.providerAccountId ? { providerAccountId: 1 } : {}),
              },
            }
          : {}),
      },
      { returnDocument: 'after', upsert: true },
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

  /**
   * Every connection belonging to one account at a provider, across all orgs.
   * Global on purpose: a provider-initiated teardown (Meta deauthorize / data
   * deletion) speaks for the person, not for one tenant, and the same Facebook
   * account may have been connected by several organizations.
   */
  async findByProviderAccount(
    provider: ConnectionProvider,
    providerAccountId: string,
  ): Promise<AppConnectionDocument[]> {
    if (!providerAccountId) return [];
    return this.model.find({ provider, providerAccountId }).exec();
  }

  /** Delete the connection owned by an instance (on disconnect/instance delete). */
  async deleteByInstance(
    organizationId: string,
    instanceId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(instanceId)) return;
    await this.model.deleteOne({
      instanceId: new Types.ObjectId(instanceId),
      organizationId: new Types.ObjectId(organizationId),
    });
  }

  /** Delete every connection owned by the given instances (bulk; on uninstall). */
  async deleteByInstances(
    organizationId: string,
    instanceIds: string[],
  ): Promise<void> {
    const objectIds = instanceIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return;
    await this.model.deleteMany({
      instanceId: { $in: objectIds },
      organizationId: new Types.ObjectId(organizationId),
    });
  }
}
