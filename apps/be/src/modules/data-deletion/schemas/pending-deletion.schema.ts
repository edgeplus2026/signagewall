import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PendingDeletionType = 'account' | 'organization';
export type PendingDeletionStatus = 'pending' | 'done';

export type PendingDeletionDocument = HydratedDocument<PendingDeletion>;

/**
 * Queue row for a GDPR deletion that is in its 30-day grace period. The target
 * (a user account or an organization) is soft-deactivated immediately; the daily
 * sweep physically erases it once `scheduledFor` passes. Removing the row (before
 * the sweep) cancels the deletion.
 */
@Schema({ timestamps: true, collection: 'pendingdeletions' })
export class PendingDeletion {
  @Prop({ type: String, enum: ['account', 'organization'], required: true })
  type: PendingDeletionType;

  /** User id (account) or organization id. */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @Prop({ type: Date, required: true })
  scheduledFor: Date;

  @Prop({ type: String, enum: ['pending', 'done'], default: 'pending' })
  status: PendingDeletionStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const PendingDeletionSchema =
  SchemaFactory.createForClass(PendingDeletion);

// One active deletion per target; the sweep queries pending + due rows.
PendingDeletionSchema.index({ status: 1, scheduledFor: 1 });
