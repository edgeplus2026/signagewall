import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export type NotificationStatus = 'draft' | 'published';
export type NotificationAudienceType = 'all' | 'orgs' | 'users';

/**
 * Distinguishes super-admin authored broadcasts from system-generated alerts
 * (e.g. device-offline / recovery). The CMS uses this to render a per-kind icon
 * and the admin authoring list filters it out of the system kinds.
 */
export type NotificationKind =
  | 'broadcast'
  | 'device-offline'
  | 'device-recovered';

/** Tiptap document JSON. Stored verbatim and rendered through ProseMirror. */
export type RichTextContent = Record<string, unknown>;

@Schema({ _id: false })
export class NotificationTranslation {
  @Prop({ trim: true, default: '' })
  title: string;

  /** Tiptap JSON (`{ type: 'doc', content: [...] }`) or null when absent. */
  @Prop({ type: Object, default: null })
  content: RichTextContent | null;
}

const NotificationTranslationSchema = SchemaFactory.createForClass(
  NotificationTranslation,
);

@Schema({ _id: false })
export class NotificationTranslations {
  @Prop({ type: NotificationTranslationSchema, required: true })
  en: NotificationTranslation;

  @Prop({
    type: NotificationTranslationSchema,
    default: () => ({ title: '', content: null }),
  })
  sr: NotificationTranslation;
}

const NotificationTranslationsSchema = SchemaFactory.createForClass(
  NotificationTranslations,
);

@Schema({ _id: false })
export class NotificationAudience {
  @Prop({ enum: ['all', 'orgs', 'users'], default: 'all' })
  type: NotificationAudienceType;

  /** Reserved for future org/user targeting; unused while `type === 'all'`. */
  @Prop({ type: [String], default: undefined })
  ids?: string[];
}

const NotificationAudienceSchema =
  SchemaFactory.createForClass(NotificationAudience);

/**
 * Structured context for system-generated notifications (device alerts). Pure
 * traceability/history — the rendered message lives in `translations`.
 */
@Schema({ _id: false })
export class NotificationMeta {
  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Screen' })
  screenId?: Types.ObjectId;

  @Prop()
  deviceId?: string;

  /** When the device was last seen before the incident (downtime anchor). */
  @Prop({ type: Date })
  offlineSince?: Date;

  /** Outage duration in ms, set on the recovery notification. */
  @Prop()
  downtimeMs?: number;
}

const NotificationMetaSchema = SchemaFactory.createForClass(NotificationMeta);

/**
 * A global, super-admin authored in-app announcement. Read-state is tracked
 * per user in {@link NotificationReceipt} rather than by copying the document.
 * A notification is only visible once published and within its publish/expiry
 * window — see `NotificationsRepository` for the visibility predicate.
 */
@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: NotificationTranslationsSchema, required: true })
  translations: NotificationTranslations;

  @Prop({
    enum: ['broadcast', 'device-offline', 'device-recovered'],
    default: 'broadcast',
    index: true,
  })
  kind: NotificationKind;

  @Prop({ enum: ['draft', 'published'], default: 'draft' })
  status: NotificationStatus;

  /** Moment the notification becomes visible. Immediate publish = now. */
  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  /** Optional auto-hide; null means never expires. */
  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  /** Reserved for scheduled publishing (no scheduler in MVP). */
  @Prop({ type: Date, default: null })
  scheduledAt: Date | null;

  @Prop({ type: NotificationAudienceSchema, default: () => ({ type: 'all' }) })
  audience: NotificationAudience;

  /** Authoring super-admin; null for system-generated notifications. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  /** Present only on system-generated notifications. */
  @Prop({ type: NotificationMetaSchema, default: null })
  meta: NotificationMeta | null;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Supports the visibility scan (status + audience + publish/expiry window).
NotificationSchema.index({
  status: 1,
  'audience.type': 1,
  publishedAt: 1,
  expiresAt: 1,
});
