import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import type {
  ConfigSchema,
  DataSource,
  RuntimeKind,
} from '@signagewall/apps-contract';

/**
 * Catalog entry for a code-defined app. Presentation COPY (tagline, description,
 * about) and CATEGORIES are NOT stored here — they live in code and the CMS i18n
 * bundle (`apps.catalog.<slug>.*`, `apps.categories.*`), keyed by `slug`, so the
 * store ships translated. This holds only the technical definition + governance.
 */
@Schema({ timestamps: true, collection: 'apps' })
export class App {
  /** Stable identifier; the player registry key and catalog slug. */
  @Prop({ required: true, trim: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, default: 'native' })
  runtimeKind!: RuntimeKind;

  @Prop({ type: String, required: true, default: 'static' })
  dataSource!: DataSource;

  /** The config form spec (validated against by instances). Stored as JSON. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  configSchema!: ConfigSchema;

  @Prop({ required: true, default: 1, min: 1 })
  version!: number;

  /**
   * True for apps that render as a persistent overlay over a screen's content
   * (e.g. the ticker band) instead of taking a rotation slot. Synced from the
   * code manifest; the CMS hides such apps from the content pickers.
   */
  @Prop({ default: false })
  overlay!: boolean;

  /** Inline SVG markup used as the app icon. */
  @Prop({ default: '' })
  iconSvg!: string;

  /** Brand colour (hex) used for the icon tile / accent. */
  @Prop({ default: '' })
  color!: string;

  /** The single public/private toggle — only public apps are offered to organizations. */
  @Prop({ required: true, default: false })
  isPublic!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppDocument = HydratedDocument<App>;

export const AppSchema = SchemaFactory.createForClass(App);

AppSchema.index({ isPublic: 1, updatedAt: -1 });
