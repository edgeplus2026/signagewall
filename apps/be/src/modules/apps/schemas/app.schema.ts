import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import type { ConfigSchema, DataSource, RuntimeKind } from '@edge/apps-contract';

export enum AppStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

/** Card presentation accent (Tailwind gradient classes) when there's no icon image. */
@Schema({ _id: false })
export class AppAccent {
  @Prop({ required: true })
  logo!: string;

  @Prop({ required: true })
  glow!: string;
}

export const AppAccentSchema = SchemaFactory.createForClass(AppAccent);

@Schema({ timestamps: true, collection: 'apps' })
export class App {
  /** Stable identifier; the player registry key and catalog slug. */
  @Prop({ required: true, trim: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  tagline!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  /** Long marketing copy for the "About this app" section. */
  @Prop({ default: '' })
  about!: string;

  @Prop({ required: true, default: 'native' })
  runtimeKind!: RuntimeKind;

  @Prop({ required: true, default: 'static' })
  dataSource!: DataSource;

  /** The config form spec (validated against by instances). Stored as JSON. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  configSchema!: ConfigSchema;

  @Prop({ required: true, default: 1, min: 1 })
  version!: number;

  /** Public image URL for the app icon; falls back to the accent gradient. */
  @Prop({ trim: true })
  iconUrl?: string;

  /** Public image URLs for the drawer carousel. */
  @Prop({ type: [String], default: [] })
  screenshots!: string[];

  @Prop({ type: AppAccentSchema })
  accent?: AppAccent;

  /** The public/private toggle — only public apps are offered to organizations. */
  @Prop({ required: true, default: false })
  isPublic!: boolean;

  @Prop({ required: true, enum: AppStatus, default: AppStatus.DRAFT })
  status!: AppStatus;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppDocument = HydratedDocument<App>;

export const AppSchema = SchemaFactory.createForClass(App);

AppSchema.index({ isPublic: 1, status: 1, updatedAt: -1 });
