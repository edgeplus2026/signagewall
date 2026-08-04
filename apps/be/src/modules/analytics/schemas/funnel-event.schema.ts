import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FunnelEventDocument = HydratedDocument<FunnelEvent>;

export enum FunnelEventName {
  MARKETING_LANDING = 'marketing_landing',
  MARKETING_CTA_CLICKED = 'marketing_cta_clicked',
  QUOTE_STARTED = 'quote_started',
  GENERATE_LEAD = 'generate_lead',
  REGISTRATION_STARTED = 'registration_started',
  SIGN_UP = 'sign_up',
  EMAIL_VERIFIED = 'email_verified',
  TRIAL_STARTED = 'trial_started',
  LOGIN = 'login',
  ORGANIZATION_CREATED = 'organization_created',
  SCREEN_CREATED = 'screen_created',
  CONTENT_PUBLISHED = 'content_published',
  DEVICE_PAIRED = 'device_paired',
  FIRST_SCREEN_ACTIVATED = 'first_screen_activated',
  SUBSCRIPTION_REQUESTED = 'subscription_requested',
  INVOICE_ISSUED = 'invoice_issued',
  PAYMENT_RECEIVED = 'payment_received',
  PURCHASE = 'purchase',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  PAYMENT_OVERDUE = 'payment_overdue',
}

export const CLIENT_FUNNEL_EVENTS = [
  FunnelEventName.MARKETING_LANDING,
  FunnelEventName.MARKETING_CTA_CLICKED,
  FunnelEventName.QUOTE_STARTED,
  FunnelEventName.GENERATE_LEAD,
  FunnelEventName.REGISTRATION_STARTED,
] as const;

@Schema({ _id: false })
export class AttributionTouch {
  @Prop({ trim: true, maxlength: 120 })
  source?: string;

  @Prop({ trim: true, maxlength: 120 })
  medium?: string;

  @Prop({ trim: true, maxlength: 160 })
  campaign?: string;

  @Prop({ trim: true, maxlength: 160 })
  term?: string;

  @Prop({ trim: true, maxlength: 160 })
  content?: string;

  @Prop({ trim: true, maxlength: 180 })
  clickId?: string;

  @Prop({ trim: true, maxlength: 500 })
  landingPath?: string;

  @Prop({ trim: true, maxlength: 253 })
  referrerDomain?: string;

  @Prop({ trim: true, maxlength: 20 })
  locale?: string;

  @Prop({ type: Date })
  occurredAt?: Date;
}

const AttributionTouchSchema = SchemaFactory.createForClass(AttributionTouch);

@Schema({ timestamps: true, collection: 'funnelevents' })
export class FunnelEvent {
  @Prop({ type: String, enum: FunnelEventName, required: true, index: true })
  eventName: FunnelEventName;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  occurredAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true,
  })
  organizationId: Types.ObjectId | null;

  @Prop({ trim: true, maxlength: 100, index: true })
  anonymousId?: string;

  @Prop({ trim: true, maxlength: 160 })
  leadType?: string;

  @Prop({ trim: true, maxlength: 240 })
  dedupeKey?: string;

  @Prop({ type: AttributionTouchSchema })
  firstTouch?: AttributionTouch;

  @Prop({ type: AttributionTouchSchema })
  lastTouch?: AttributionTouch;

  /** Strictly allowlisted, non-PII metadata only. */
  @Prop({ type: Object, default: {} })
  properties: Record<string, string | number | boolean>;

  @Prop({ default: false })
  analyticsConsent: boolean;

  @Prop({ trim: true, maxlength: 40 })
  source: string;

  createdAt: Date;
  updatedAt: Date;
}

export const FunnelEventSchema = SchemaFactory.createForClass(FunnelEvent);

FunnelEventSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: 'string' } },
  },
);
FunnelEventSchema.index({ occurredAt: -1, eventName: 1 });
FunnelEventSchema.index({ userId: 1, occurredAt: 1 });
