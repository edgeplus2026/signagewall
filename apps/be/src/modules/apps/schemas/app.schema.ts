import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

import type {
  ConfigSchema,
  DataSource,
  RuntimeKind,
} from '@edge/apps-contract';

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

  @Prop({ type: String, required: true, default: 'native' })
  runtimeKind!: RuntimeKind;

  @Prop({ type: String, required: true, default: 'static' })
  dataSource!: DataSource;

  /** The config form spec (validated against by instances). Stored as JSON. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  configSchema!: ConfigSchema;

  @Prop({ required: true, default: 1, min: 1 })
  version!: number;

  /** Inline SVG markup used as the app icon. */
  @Prop({ default: '' })
  iconSvg!: string;

  /** Brand colour (hex) used for the icon tile / accent. */
  @Prop({ default: '' })
  color!: string;

  /** The single public/private toggle — only public apps are offered to organizations. */
  @Prop({ required: true, default: false })
  isPublic!: boolean;

  /** Catalog categories this app belongs to (super-admin managed). */
  @Prop({ type: [Types.ObjectId], ref: 'AppCategory', default: [] })
  categoryIds!: Types.ObjectId[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppDocument = HydratedDocument<App>;

export const AppSchema = SchemaFactory.createForClass(App);

AppSchema.index({ isPublic: 1, updatedAt: -1 });
