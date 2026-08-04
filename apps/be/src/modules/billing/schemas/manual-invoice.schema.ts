import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ManualInvoiceDocument = HydratedDocument<ManualInvoice>;

export enum ManualInvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  VOID = 'void',
}

export enum ManualInvoiceActivityType {
  CREATED = 'created',
  UPDATED = 'updated',
  SENT = 'sent',
  PAID = 'paid',
  MARKED_OVERDUE = 'marked_overdue',
  VOIDED = 'voided',
  ARCHIVED = 'archived',
}

@Schema({ _id: false })
export class ManualInvoiceActivity {
  @Prop({ type: String, enum: ManualInvoiceActivityType, required: true })
  type: ManualInvoiceActivityType;

  /** Null only for an automatic system transition such as overdue. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  actorUserId: Types.ObjectId | null;

  @Prop({ type: Date, required: true, default: Date.now })
  occurredAt: Date;

  @Prop({ trim: true })
  note?: string;
}

const ManualInvoiceActivitySchema = SchemaFactory.createForClass(
  ManualInvoiceActivity,
);

/**
 * A mirror of an invoice created and emailed outside SignageWall. Draft fields
 * are optional on purpose: an incomplete draft is visible in Billing Exceptions
 * instead of being lost in a founder's notes or inbox.
 */
@Schema({ timestamps: true, collection: 'manualinvoices' })
export class ManualInvoice {
  @Prop({
    type: Types.ObjectId,
    ref: 'BillingAccount',
    required: true,
    index: true,
  })
  billingAccountId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerUserId: Types.ObjectId;

  /** Customer data snapshot: invoices remain understandable after profile edits. */
  @Prop({ required: true, trim: true })
  customerName: string;

  @Prop({ trim: true })
  companyName?: string;

  @Prop({ lowercase: true, trim: true })
  billingEmail?: string;

  @Prop({ trim: true })
  invoiceNumber?: string;

  /** Integer minor units, e.g. cents. Never store floating-point money. */
  @Prop({ min: 0 })
  amountMinor?: number;

  @Prop({ uppercase: true, trim: true, minlength: 3, maxlength: 3 })
  currency?: string;

  @Prop({ min: 1, required: true })
  screenQuantity: number;

  @Prop({ type: Date, default: null })
  servicePeriodStart: Date | null;

  @Prop({ type: Date, default: null })
  servicePeriodEnd: Date | null;

  @Prop({ type: Date, default: null, index: true })
  dueAt: Date | null;

  @Prop({
    type: String,
    enum: ManualInvoiceStatus,
    default: ManualInvoiceStatus.DRAFT,
  })
  status: ManualInvoiceStatus;

  @Prop({ trim: true })
  note?: string;

  @Prop({ type: Date, default: null })
  sentAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  sentBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  paidAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  paidBy: Types.ObjectId | null;

  @Prop({ trim: true })
  paymentReference?: string;

  @Prop({ type: Date, default: null })
  voidedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  voidedBy: Types.ObjectId | null;

  @Prop({ trim: true })
  voidReason?: string;

  /**
   * Terminal invoices are hidden from the operational table instead of being
   * physically deleted. This preserves the payment audit trail and keeps an
   * archived paid invoice from changing the customer's entitlement.
   */
  @Prop({ type: Date, default: null, index: true })
  archivedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  archivedBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;

  @Prop({ type: [ManualInvoiceActivitySchema], default: [] })
  activity: ManualInvoiceActivity[];

  createdAt: Date;
  updatedAt: Date;
}

export const ManualInvoiceSchema = SchemaFactory.createForClass(ManualInvoice);

ManualInvoiceSchema.index(
  { invoiceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { invoiceNumber: { $type: 'string' } },
  },
);
ManualInvoiceSchema.index({
  archivedAt: 1,
  status: 1,
  dueAt: 1,
  createdAt: -1,
});
ManualInvoiceSchema.index({ customerUserId: 1, servicePeriodEnd: -1 });
