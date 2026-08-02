import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { UserPlan } from '../../users/schemas/user.schema';

export type UpgradeRequestStatus = 'open' | 'resolved';

export type UpgradeRequestDocument = HydratedDocument<UpgradeRequest>;

/**
 * A customer asking for licences. Billing is invoiced by hand, so this is the
 * whole "checkout": the request is stored, a notification email goes out, and a
 * super-admin raises the account's plan once the invoice is settled.
 *
 * The row is kept rather than only emailed because an email that lands in spam
 * is a lost sale, and because the super-admin needs a list of who is waiting.
 */
@Schema({ timestamps: true, collection: 'upgraderequests' })
export class UpgradeRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  /** Plan the account was on when it asked — free upgrade vs. extra licences. */
  @Prop({ type: String, enum: UserPlan, required: true })
  planAtRequest: UserPlan;

  /** Licences held when the request was made, for reading the delta. */
  @Prop({ required: true, min: 0 })
  screenLimitAtRequest: number;

  /** Total screens the customer wants to end up with. */
  @Prop({ required: true, min: 1 })
  requestedScreens: number;

  @Prop({ trim: true })
  message?: string;

  /** Contact details as entered on the form; may differ from the profile. */
  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  company?: string;

  @Prop({ type: String, enum: ['open', 'resolved'], default: 'open' })
  status: UpgradeRequestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  resolvedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  resolvedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UpgradeRequestSchema =
  SchemaFactory.createForClass(UpgradeRequest);

// The admin list is "open first, newest first".
UpgradeRequestSchema.index({ status: 1, createdAt: -1 });
