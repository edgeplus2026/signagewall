import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** A super-admin-managed catalog category for grouping apps. */
@Schema({ timestamps: true, collection: 'appCategories' })
export class AppCategory {
  @Prop({ required: true, trim: true })
  name!: string;

  /** URL/filter-friendly identifier, derived from the name. */
  @Prop({ required: true, trim: true, unique: true, index: true })
  slug!: string;

  /** Display order in the catalog (ascending). */
  @Prop({ required: true, default: 0 })
  order!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppCategoryDocument = HydratedDocument<AppCategory>;

export const AppCategorySchema = SchemaFactory.createForClass(AppCategory);
