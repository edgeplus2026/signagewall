import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * The same playback, summed by month and kept forever.
 *
 * It exists because the daily detail does not: those rows are deleted after
 * ninety days, and the questions that outlive that window are real ones — an
 * annual report, a contract that ran last autumn, a dispute about what a screen
 * showed in March. Rebuilding any of that from deleted rows is impossible, and a
 * rollup written later cannot recover what was already gone. So it is written
 * from day one, in the same operation as the daily row: the only way the two can
 * never disagree is if neither can happen without the other.
 *
 * The cost is negligible next to what it protects: one row per screen per item
 * per month, roughly a thirtieth of the daily volume, with no histogram.
 * Dayparting is deliberately absent — "which hour of which day in March 2024"
 * is not a question anyone asks a year later, and carrying it would multiply the
 * only collection here that grows without bound.
 */
@Schema({ timestamps: true, collection: 'playbackmonths' })
export class PlaybackMonth {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Screen', required: true })
  screenId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 64 })
  contentId!: string;

  /** 'YYYY-MM', taken from the same device-local day as the daily row. */
  @Prop({ required: true, trim: true, maxlength: 7 })
  month!: string;

  @Prop({ type: String, trim: true, maxlength: 16 })
  kind?: string;

  @Prop({ trim: true, maxlength: 64 })
  slug?: string;

  @Prop({ default: 0 })
  plays!: number;

  @Prop({ default: 0 })
  airtimeMs!: number;

  /** First and last appearance in the month, by the device's clock. */
  @Prop({ type: Date })
  firstAt?: Date;

  @Prop({ type: Date })
  lastAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PlaybackMonthDocument = HydratedDocument<PlaybackMonth>;

export const PlaybackMonthSchema = SchemaFactory.createForClass(PlaybackMonth);

PlaybackMonthSchema.index(
  { screenId: 1, month: 1, contentId: 1 },
  { unique: true },
);

PlaybackMonthSchema.index({ organizationId: 1, month: 1 });
