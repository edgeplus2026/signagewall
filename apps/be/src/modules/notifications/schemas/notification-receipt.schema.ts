import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationReceiptDocument = HydratedDocument<NotificationReceipt>;

/**
 * Per-user read marker for a {@link Notification}. The presence of a receipt
 * means the user has read that notification; absence (within the visible set)
 * means unread. The unique compound index also backs the unread-count lookup.
 */
@Schema({ timestamps: true, collection: 'notificationreceipts' })
export class NotificationReceipt {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Notification', required: true })
  notificationId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  readAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationReceiptSchema =
  SchemaFactory.createForClass(NotificationReceipt);

NotificationReceiptSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true },
);
