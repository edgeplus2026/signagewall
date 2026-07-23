import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Notification,
  NotificationDocument,
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

  findById(id: string): Promise<NotificationDocument | null> {
    return this.notificationModel.findById(id).exec();
  }

  async listAdmin(params: {
    page: number;
    limit: number;
    status?: NotificationStatus;
  }): Promise<{ items: NotificationDocument[]; total: number }> {
    const { page, limit, status } = params;
    const filter = status ? { status } : {};
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
      .findByIdAndUpdate(id, { $set: set }, { returnDocument: 'after' })
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
        { returnDocument: 'after' },
      )
      .exec();
  }

  unpublish(id: string): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findByIdAndUpdate(
        id,
        { $set: { status: 'draft', publishedAt: null } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  delete(id: string): Promise<boolean> {
    return this.notificationModel
      .findByIdAndDelete(id)
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

  /** Match stage for notifications currently visible to a given user. */
  private visibleMatch(
    now: Date,
    userCreatedAt: Date,
  ): Record<string, unknown> {
    return {
      status: 'published',
      'audience.type': 'all',
      publishedAt: { $lte: now, $gte: userCreatedAt },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };
  }

  findVisibleById(
    id: string,
    userCreatedAt: Date,
  ): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...this.visibleMatch(new Date(), userCreatedAt),
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
        { $match: this.visibleMatch(now, userCreatedAt) },
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
        { $match: this.visibleMatch(now, params.userCreatedAt) },
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
        { $match: this.visibleMatch(now, userCreatedAt) },
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
