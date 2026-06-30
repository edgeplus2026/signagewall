import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

/** Recipient roles use the normalized API roles (legacy `owner` ⇒ `admin`). */
export type AlertRecipientRole = 'admin' | 'member';

/**
 * Per-organization device-offline alerting configuration. Embedded on the
 * Organization; sensible defaults mean alerting works out of the box without
 * any operator setup.
 */
@Schema({ _id: false })
export class OrgAlertSettings {
  /** Master switch for offline alerting in this organization. */
  @Prop({ default: true })
  enabled: boolean;

  /** Minutes a device must stay offline before an alert fires (anti-flap). */
  @Prop({ default: 10, min: 1, max: 1440 })
  offlineThresholdMin: number;

  /** Which member roles receive the in-app alert. */
  @Prop({ type: [String], enum: ['admin', 'member'], default: ['admin'] })
  recipientRoles: AlertRecipientRole[];

  /** Suppress alerts while a screen is in a scheduled availability-off window. */
  @Prop({ default: true })
  respectAvailability: boolean;
}

export const OrgAlertSettingsSchema =
  SchemaFactory.createForClass(OrgAlertSettings);

/** Effective defaults applied when an organization has no `alertSettings` yet. */
export const DEFAULT_ORG_ALERT_SETTINGS: OrgAlertSettings = {
  enabled: true,
  offlineThresholdMin: 10,
  recipientRoles: ['admin'],
  respectAvailability: true,
};

/** Fills in defaults for organizations created before alert settings existed. */
export const resolveOrgAlertSettings = (
  settings: OrgAlertSettings | undefined | null,
): OrgAlertSettings => ({
  enabled: settings?.enabled ?? DEFAULT_ORG_ALERT_SETTINGS.enabled,
  offlineThresholdMin:
    settings?.offlineThresholdMin ??
    DEFAULT_ORG_ALERT_SETTINGS.offlineThresholdMin,
  recipientRoles:
    settings?.recipientRoles && settings.recipientRoles.length > 0
      ? settings.recipientRoles
      : DEFAULT_ORG_ALERT_SETTINGS.recipientRoles,
  respectAvailability:
    settings?.respectAvailability ??
    DEFAULT_ORG_ALERT_SETTINGS.respectAvailability,
});

@Schema({
  timestamps: true,
  collection: 'organizations',
})
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  /** Device-offline alerting configuration. */
  @Prop({ type: OrgAlertSettingsSchema, default: () => ({}) })
  alertSettings: OrgAlertSettings;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
