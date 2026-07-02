import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';

import { User, UserDocument } from './schemas/user.schema';

export type AdminUsersSortField =
  | 'name'
  | 'createdAt'
  | 'isActive'
  | 'organizationCount';

export interface FindPaginatedUsersParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: AdminUsersSortField;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fields declared with `select: false` on the user schema. Pass them
 * explicitly via the `select` option when a query needs them.
 */
export type UserSelectField =
  | 'password'
  | 'refreshTokenHash'
  | 'passwordResetToken'
  | 'passwordResetExpiresAt'
  | 'emailVerificationToken'
  | 'emailVerificationExpiresAt';

export interface FindUserOptions {
  select?: UserSelectField[];
  session?: ClientSession;
}

const buildSelect = (fields?: UserSelectField[]): string | undefined =>
  fields && fields.length > 0
    ? fields.map((field) => `+${field}`).join(' ')
    : undefined;

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    data: Partial<User>,
    session?: ClientSession,
  ): Promise<UserDocument> {
    const [user] = await this.userModel.create([data], { session });
    return user;
  }

  /** Start the deletion grace period: block login + revoke sessions. */
  async deactivate(userId: string, session?: ClientSession): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        { $set: { isActive: false }, $unset: { refreshTokenHash: '' } },
        { session },
      )
      .exec();
  }

  /** Undo a pending account deletion within the grace window. */
  async reactivate(userId: string, session?: ClientSession): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $set: { isActive: true } }, { session })
      .exec();
  }

  /**
   * Irreversibly anonymize PII while keeping the row so non-personal history
   * (that references the user id) stays intact — GDPR/ZZPL erasure.
   */
  async anonymize(userId: string, session?: ClientSession): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          $set: {
            name: 'Deleted user',
            email: `deleted+${userId}@deleted.local`,
            isActive: false,
            isEmailVerified: false,
          },
          $unset: {
            password: '',
            phone: '',
            company: '',
            googleId: '',
            refreshTokenHash: '',
            passwordResetToken: '',
            passwordResetExpiresAt: '',
            emailVerificationToken: '',
            emailVerificationExpiresAt: '',
          },
        },
        { session },
      )
      .exec();
  }

  findById(
    id: string,
    options?: FindUserOptions,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findById(id);
    const select = buildSelect(options?.select);
    if (select) {
      query.select(select);
    }
    if (options?.session) {
      query.session(options.session);
    }
    return query.exec();
  }

  findPaginated(
    params: FindPaginatedUsersParams,
  ): Promise<{ users: UserDocument[]; total: number }> {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const skip = (page - 1) * limit;
    const filter = this.buildSearchFilter(search);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    if (sortBy === 'organizationCount') {
      return this.findPaginatedWithOrgCount(filter, skip, limit, sortDirection);
    }

    const sortField =
      sortBy === 'name'
        ? 'name'
        : sortBy === 'isActive'
          ? 'isActive'
          : 'createdAt';

    return Promise.all([
      this.userModel
        .find(filter)
        .sort({ [sortField]: sortDirection, _id: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]).then(([users, total]) => ({ users, total }));
  }

  private buildSearchFilter(search?: string): Record<string, unknown> {
    const trimmed = search?.trim();
    if (!trimmed) {
      return {};
    }

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    return {
      $or: [{ name: regex }, { email: regex }],
    };
  }

  private async findPaginatedWithOrgCount(
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
    sortDirection: 1 | -1,
  ): Promise<{ users: UserDocument[]; total: number }> {
    const [result] = await this.userModel
      .aggregate<{
        users: UserDocument[];
        total: Array<{ count: number }>;
      }>([
        { $match: filter },
        {
          $lookup: {
            from: 'organizationmemberships',
            localField: '_id',
            foreignField: 'userId',
            as: 'memberships',
          },
        },
        { $addFields: { organizationCount: { $size: '$memberships' } } },
        { $sort: { organizationCount: sortDirection, _id: 1 } },
        {
          $facet: {
            users: [
              { $skip: skip },
              { $limit: limit },
              { $project: { memberships: 0 } },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ])
      .exec();

    return {
      users: result?.users ?? [],
      total: result?.total[0]?.count ?? 0,
    };
  }

  findByEmail(
    email: string,
    options?: FindUserOptions,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    const select = buildSelect(options?.select);
    if (select) {
      query.select(select);
    }
    return query.exec();
  }

  findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  findByPasswordResetTokenHash(
    tokenHash: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+password +passwordResetToken +passwordResetExpiresAt')
      .exec();
  }

  findByEmailVerificationTokenHash(
    tokenHash: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        emailVerificationToken: tokenHash,
        emailVerificationExpiresAt: { $gt: new Date() },
      })
      .select('+emailVerificationToken +emailVerificationExpiresAt')
      .exec();
  }

  updateById(id: string, data: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    return this.userModel
      .findByIdAndUpdate(id, { refreshTokenHash })
      .exec()
      .then(() => undefined);
  }

  deleteById(id: string, session?: ClientSession): Promise<boolean> {
    return this.userModel
      .findByIdAndDelete(id, { session })
      .exec()
      .then((user) => user !== null);
  }
}
