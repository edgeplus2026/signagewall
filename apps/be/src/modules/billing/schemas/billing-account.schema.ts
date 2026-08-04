import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BillingAccountDocument = HydratedDocument<BillingAccount>;

export enum BillingAccountStatus {
  TRIALING = 'trialing',
  PENDING_INVOICE = 'pending_invoice',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

/**
 * The commercial customer. It deliberately sits beside the legacy plan fields
 * on User while billing is rolled out: billing is the source of truth for new
 * manual invoices, and User.plan/screenLimit remain the entitlement projection.
 */
@Schema({ timestamps: true, collection: 'billingaccounts' })
export class BillingAccount {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  ownerUserId: Types.ObjectId;

  @Prop({ trim: true })
  companyName?: string;

  @Prop({ lowercase: true, trim: true })
  billingEmail?: string;

  @Prop({
    type: String,
    enum: BillingAccountStatus,
    default: BillingAccountStatus.TRIALING,
    index: true,
  })
  status: BillingAccountStatus;

  @Prop({
    type: String,
    enum: BillingInterval,
    default: BillingInterval.MONTHLY,
  })
  billingInterval: BillingInterval;

  @Prop({ min: 1, default: 1 })
  screenQuantity: number;

  @Prop({ type: Date, default: null })
  currentPeriodStart: Date | null;

  @Prop({ type: Date, default: null, index: true })
  currentPeriodEnd: Date | null;

  /** A past-due account remains operational; this is an alert deadline only. */
  @Prop({ type: Date, default: null })
  graceEndsAt: Date | null;

  /** Once set, downgrade/reactivation must never create a fresh trial. */
  @Prop({ type: Date, required: true, default: Date.now })
  trialConsumedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const BillingAccountSchema =
  SchemaFactory.createForClass(BillingAccount);

BillingAccountSchema.index({ status: 1, currentPeriodEnd: 1 });
