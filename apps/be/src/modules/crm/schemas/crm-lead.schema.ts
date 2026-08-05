import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { AttributionTouch } from '../../analytics/schemas/funnel-event.schema';

export type CrmLeadDocument = HydratedDocument<CrmLead>;

export enum CrmLeadType {
  CONTACT = 'contact',
  QUOTE = 'quote',
}

export enum CrmLeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  WON = 'won',
  LOST = 'lost',
  SPAM = 'spam',
}

export enum CrmLeadEmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

@Schema({ _id: false })
export class CrmLeadStatusChange {
  @Prop({ type: String, enum: CrmLeadStatus, required: true })
  status: CrmLeadStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  actorUserId: Types.ObjectId | null;

  @Prop({ type: Date, required: true, default: Date.now })
  occurredAt: Date;
}

@Schema({ _id: false })
export class CrmLeadNote {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorUserId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  text: string;

  @Prop({ type: Date, required: true, default: Date.now })
  createdAt: Date;
}

const CrmLeadStatusChangeSchema =
  SchemaFactory.createForClass(CrmLeadStatusChange);
const CrmLeadNoteSchema = SchemaFactory.createForClass(CrmLeadNote);

/** PII lives here, behind SuperAdminGuard, and never in FunnelEvent.properties. */
@Schema({ timestamps: true, collection: 'crmleads' })
export class CrmLead {
  @Prop({ required: true, unique: true, index: true, maxlength: 120 })
  submissionId: string;

  @Prop({ type: String, enum: CrmLeadType, required: true, index: true })
  type: CrmLeadType;

  @Prop({
    type: String,
    enum: CrmLeadStatus,
    default: CrmLeadStatus.NEW,
    index: true,
  })
  status: CrmLeadStatus;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    index: true,
  })
  email: string;

  @Prop({ trim: true, maxlength: 40 })
  phone?: string;

  @Prop({ trim: true, maxlength: 160 })
  company?: string;

  @Prop({ required: true, trim: true, maxlength: 5000 })
  message: string;

  @Prop({ min: 1, max: 100000 })
  screenQuantity?: number;

  @Prop({ trim: true, maxlength: 120 })
  city?: string;

  @Prop({ uppercase: true, trim: true, minlength: 2, maxlength: 2 })
  country?: string;

  @Prop({ trim: true, maxlength: 20 })
  locale?: string;

  @Prop({ trim: true, maxlength: 100, index: true })
  anonymousId?: string;

  @Prop({ type: Object })
  firstTouch?: AttributionTouch;

  @Prop({ type: Object })
  lastTouch?: AttributionTouch;

  @Prop({
    type: String,
    enum: CrmLeadEmailStatus,
    default: CrmLeadEmailStatus.PENDING,
  })
  emailNotificationStatus: CrmLeadEmailStatus;

  @Prop({ type: Date, default: null })
  emailNotificationAt: Date | null;

  @Prop({ type: [CrmLeadStatusChangeSchema], default: [] })
  statusHistory: CrmLeadStatusChange[];

  @Prop({ type: [CrmLeadNoteSchema], default: [] })
  internalNotes: CrmLeadNote[];

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const CrmLeadSchema = SchemaFactory.createForClass(CrmLead);

CrmLeadSchema.index({ archivedAt: 1, status: 1, createdAt: -1 });
CrmLeadSchema.index({ type: 1, createdAt: -1 });
