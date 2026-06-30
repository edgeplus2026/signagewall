import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Notification,
  NotificationDocument,
  NotificationKind,
  NotificationStatus,
  RichTextContent,
} from './schemas/notification.schema';
import {
  NotificationReceipt,
  NotificationReceiptDocument,
} from './schemas/notification-receipt.schema';
import { VisibleNotificationRow } from './mappers/notification.mapper';

export interface CreateNotificationData {
  translations: {
    en: { title: string; content: RichTextContent };
    sr?: { title?: string; content?: RichTextContent };
  };
  expiresAt: Date | null;
  createdBy: string;
}

export interface SystemNotificationMeta {
  organizationId?: string;
  screenId?: string;
  deviceId?: string;
  offlineSince?: Date;
  downtimeMs?: number;
}

export interface CreateSystemNotificationData {
  kind: NotificationKind;
  translations: {
    en: { title: string; content?: RichTextContent | null };
    sr?: { title?: string; content?: RichTextContent | null };
  };
  /** User ids the notification is delivered to (audience `users`). */
  recipientUserIds: string[];
  publishedAt: Date;
  expiresAt?: Date | null;
  meta?: SystemNotificationMeta;
}

/** Kinds that are system-generated and hidden from the super-admin authoring list. */
const SYSTEM_KINDS: NotificationKind[] = ['device-offline', 'device-recovered'];

export interface UpdateNotificationData {
  translations?: CreateNotificationData['translations'];
  expiresAt?: Date | null;
}

/** The `$lookup` stage that joins this user's receipt onto each notification. */
const receiptLookup = (userObjectId: Types.ObjectId) => ({
  $lookup: {
    from: 'notificationreceipts',
    let: { nid: '$_id' },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$notificationId', '$$nid'] },
              { $eq: ['$userId', userObjectId] },
            ],
          },
        },
      },
      { $limit: 1 },
      { $project: { readAt: 1 } },
    ],
    as: 'receipt',
  },
});

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationReceipt.name)
    private readonly receiptModel: Model<NotificationReceiptDocument>,
  ) {}

  // --- Admin (authoring) -----------------------------------------------------

  create(data: CreateNotificationData): Promise<NotificationDocument> {
    return this.notificationModel.create({
      translations: {
        en: {
          title: data.translations.en.title.trim(),
          content: data.translations.en.content,
        },
        sr: {
          title: data.translations.sr?.title?.trim() ?? '',
          content: data.translations.sr?.content ?? null,
        },
      },
      status: 'draft',
      expiresAt: data.expiresAt,
      audience: { type: 'all' },
      createdBy: new Types.ObjectId(data.createdBy),
    });
  }

  /**
   * Creates an already-published, audience-targeted notification on behalf of
   * the system (no authoring super-admin). Used by device-offline alerting.
   */
  createSystem(
    data: CreateSystemNotificationData,
  ): Promise<NotificationDocument> {
    return this.notificationModel.create({
      kind: data.kind,
      translations: {
        en: {
          title: data.translations.en.title.trim(),
          content: data.translations.en.content ?? null,
        },
        sr: {
          title: data.translations.sr?.title?.trim() ?? '',
          content: data.translations.sr?.content ?? null,
        },
      },
      status: 'published',
      publishedAt: data.publishedAt,
      expiresAt: data.expiresAt ?? null,
      audience: { type: 'users', ids: data.recipientUserIds },
      createdBy: null,
      meta: data.meta
        ? {
            ...(data.meta.organizationId
              ? { organizationId: new Types.ObjectId(data.meta.organizationId) }
              : {}),
            ...(data.meta.screenId
              ? { screenId: new Types.ObjectId(data.meta.screenId) }
              : {}),
            ...(data.meta.deviceId ? { deviceId: data.meta.deviceId } : {}),
            ...(data.meta.offlineSince
              ? { offlineSince: data.meta.offlineSince }
              : {}),
            ...(data.meta.downtimeMs !== undefined
              ? { downtimeMs: data.meta.downtimeMs }
              : {}),
          }
        : null,
    });
  }

  /**
   * Admin authoring lookup by id. Excludes system-generated kinds so the admin
   * endpoints (get/update/publish/unpublish) can never read or mutate a device
   * alert by id — matching {@link listAdmin}'s broadcasts-only contract.
   */
  findById(id: string): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findOne({ _id: new Types.ObjectId(id), kind: { $nin: SYSTEM_KINDS } })
      .exec();
  }

  async listAdmin(params: {
    page: number;
    limit: number;
    status?: NotificationStatus;
  }): Promise<{ items: NotificationDocument[]; total: number }> {
    const { page, limit, status } = params;
    // Super-admin authoring list shows broadcasts only, never system alerts.
    const filter: Record<string, unknown> = { kind: { $nin: SYSTEM_KINDS } };
    if (status) {
      filter.status = status;
    }
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  update(
    id: string,
    data: UpdateNotificationData,
  ): Promise<NotificationDocument | null> {
    const set: Record<string, unknown> = {};
    if (data.translations) {
      set.translations = {
        en: {
          title: data.translations.en.title.trim(),
          content: data.translations.en.content,
        },
        sr: {
          title: data.translations.sr?.title?.trim() ?? '',
          content: data.translations.sr?.content ?? null,
        },
      };
    }
    if (data.expiresAt !== undefined) {
      set.expiresAt = data.expiresAt;
    }

    return this.notificationModel
      .findByIdAndUpdate(id, { $set: set }, { new: true })
      .exec();
  }

  publish(
    id: string,
    data: { publishedAt: Date; expiresAt: Date | null },
  ): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'published',
            publishedAt: data.publishedAt,
            expiresAt: data.expiresAt,
          },
        },
        { new: true },
      )
      .exec();
  }

  unpublish(id: string): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findByIdAndUpdate(
        id,
        { $set: { status: 'draft', publishedAt: null } },
        { new: true },
      )
      .exec();
  }

  delete(id: string): Promise<boolean> {
    // System-generated alerts are not deletable through the admin API (they are
    // never surfaced there); keep the guard in step with findById/listAdmin.
    return this.notificationModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        kind: { $nin: SYSTEM_KINDS },
      })
      .exec()
      .then((doc) => doc !== null);
  }

  deleteReceiptsByNotificationId(id: string): Promise<void> {
    return this.receiptModel
      .deleteMany({ notificationId: new Types.ObjectId(id) })
      .exec()
      .then(() => undefined);
  }

  // --- User (inbox) ----------------------------------------------------------

  /**
   * Match stage for notifications currently visible to a given user: published,
   * within the publish/expiry window and after the account was created, and
   * either broadcast to everyone (`all`) or explicitly targeted at this user
   * (`users` audience — used by system/device alerts).
   */
  private visibleMatch(
    now: Date,
    userCreatedAt: Date,
    userId: string,
  ): Record<string, unknown> {
    return {
      status: 'published',
      publishedAt: { $lte: now, $gte: userCreatedAt },
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        {
          $or: [
            { 'audience.type': 'all' },
            { 'audience.type': 'users', 'audience.ids': userId },
          ],
        },
      ],
    };
  }

  findVisibleById(
    id: string,
    userCreatedAt: Date,
    userId: string,
  ): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...this.visibleMatch(new Date(), userCreatedAt, userId),
      })
      .exec();
  }

  async listVisible(params: {
    userId: string;
    userCreatedAt: Date;
    page: number;
    limit: number;
  }): Promise<{ items: VisibleNotificationRow[]; total: number }> {
    const { userId, userCreatedAt, page, limit } = params;
    const now = new Date();
    const userObjectId = new Types.ObjectId(userId);
    const skip = (page - 1) * limit;

    const [result] = await this.notificationModel
      .aggregate<{
        items: VisibleNotificationRow[];
        total: Array<{ count: number }>;
      }>([
        { $match: this.visibleMatch(now, userCreatedAt, userId) },
        {
          $facet: {
            items: [
              { $sort: { publishedAt: -1, _id: -1 } },
              { $skip: skip },
              { $limit: limit },
              receiptLookup(userObjectId),
              {
                $addFields: {
                  read: { $gt: [{ $size: '$receipt' }, 0] },
                  readAt: {
                    $ifNull: [{ $arrayElemAt: ['$receipt.readAt', 0] }, null],
                  },
                },
              },
              { $project: { receipt: 0 } },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ])
      .exec();

    return {
      items: result?.items ?? [],
      total: result?.total[0]?.count ?? 0,
    };
  }

  async countUnread(params: {
    userId: string;
    userCreatedAt: Date;
  }): Promise<number> {
    const now = new Date();
    const userObjectId = new Types.ObjectId(params.userId);

    const result = await this.notificationModel
      .aggregate<{
        unread: number;
      }>([
        { $match: this.visibleMatch(now, params.userCreatedAt, params.userId) },
        receiptLookup(userObjectId),
        { $match: { receipt: { $size: 0 } } },
        { $count: 'unread' },
      ])
      .exec();

    return result[0]?.unread ?? 0;
  }

  markRead(userId: string, notificationId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const notificationObjectId = new Types.ObjectId(notificationId);

    return this.receiptModel
      .updateOne(
        { userId: userObjectId, notificationId: notificationObjectId },
        {
          $setOnInsert: {
            userId: userObjectId,
            notificationId: notificationObjectId,
            readAt: new Date(),
          },
        },
        { upsert: true },
      )
      .exec()
      .then(() => undefined);
  }

  /** Marks every currently-visible unread notification read for the user. */
  async markAllRead(userId: string, userCreatedAt: Date): Promise<number> {
    const now = new Date();
    const userObjectId = new Types.ObjectId(userId);

    const rows = await this.notificationModel
      .aggregate<{
        _id: Types.ObjectId;
      }>([
        { $match: this.visibleMatch(now, userCreatedAt, userId) },
        receiptLookup(userObjectId),
        { $match: { receipt: { $size: 0 } } },
        { $project: { _id: 1 } },
      ])
      .exec();

    if (rows.length === 0) {
      return 0;
    }

    await this.receiptModel.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { userId: userObjectId, notificationId: row._id },
          update: {
            $setOnInsert: {
              userId: userObjectId,
              notificationId: row._id,
              readAt: now,
            },
          },
          upsert: true,
        },
      })),
    );

    return rows.length;
  }
}
