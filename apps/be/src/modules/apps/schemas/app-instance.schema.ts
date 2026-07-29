import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

import type { AppInstanceConfig } from '@signagewall/apps-contract';

@Schema({ timestamps: true, collection: 'appinstances' })
export class AppInstance {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'App', required: true, index: true })
  appId!: Types.ObjectId;

  /** Denormalized for the player registry / convenience. */
  @Prop({ required: true })
  appSlug!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  /** Validated against the app's config schema on write. Stored as JSON. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  config!: AppInstanceConfig;

  /** The app version the config was saved against (for future migration). */
  @Prop({ required: true, default: 1 })
  configVersion!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppInstanceDocument = HydratedDocument<AppInstance>;

export const AppInstanceSchema = SchemaFactory.createForClass(AppInstance);

AppInstanceSchema.index({ organizationId: 1, appId: 1, updatedAt: -1 });

/**
 * The app-data hot path queries instances BY SLUG, ACROSS organizations — the
 * connector cache is global, so the scheduler (every 60s), the webhook refresh
 * and the fan-out all run `find({ appSlug: { $in: [...] } })`. Without this the
 * three of them are collection scans on the busiest collection in the system.
 */
AppInstanceSchema.index({ appSlug: 1 });
