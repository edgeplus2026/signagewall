import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum ScreenItemType {
  MEDIA = 'media',
  PLAYLIST = 'playlist',
  APP = 'app',
}

export enum ScreenAvailabilityMode {
  ALWAYS = 'always',
  WEEKLY = 'weekly',
  SPECIAL = 'special',
}

export enum WeekdayKey {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

/** Per-weekday on/off window. `start`/`end` are local 'HH:mm'. */
@Schema({ _id: false })
export class WeeklyDayHours {
  @Prop({ type: String, enum: WeekdayKey, required: true })
  day!: WeekdayKey;

  @Prop({ required: true })
  enabled!: boolean;

  @Prop({ required: true })
  start!: string;

  @Prop({ required: true })
  end!: string;
}

export const WeeklyDayHoursSchema =
  SchemaFactory.createForClass(WeeklyDayHours);

/** One-off period. Dates are local 'YYYY-MM-DD'; times are local 'HH:mm'. */
@Schema({ _id: false })
export class SpecialWindow {
  @Prop({ required: true })
  startDate!: string;

  @Prop({ required: true })
  endDate!: string;

  @Prop({ required: true })
  start!: string;

  @Prop({ required: true })
  end!: string;
}

export const SpecialWindowSchema = SchemaFactory.createForClass(SpecialWindow);

@Schema({ _id: false })
export class ScreenAvailability {
  @Prop({ type: String, enum: ScreenAvailabilityMode, required: true })
  mode!: ScreenAvailabilityMode;

  /** IANA timezone, e.g. 'Europe/Belgrade'. Working hours are local to this. */
  @Prop({ required: true })
  timezone!: string;

  /** Always all 7 days, Monday..Sunday. */
  @Prop({ type: [WeeklyDayHoursSchema], default: [] })
  weekly!: WeeklyDayHours[];

  @Prop({ type: SpecialWindowSchema, required: true })
  special!: SpecialWindow;
}

export const ScreenAvailabilitySchema =
  SchemaFactory.createForClass(ScreenAvailability);

@Schema({ _id: true })
export class ScreenItemSubdocument {
  @Prop({ type: String, enum: ScreenItemType, required: true })
  type!: ScreenItemType;

  @Prop({ type: Types.ObjectId, ref: 'MediaItem' })
  mediaId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Playlist' })
  playlistId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AppInstance' })
  appInstanceId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  order!: number;

  /** Media and app items only; playlist items play their whole playlist. */
  @Prop({ min: 1, max: 3600 })
  duration?: number;

  @Prop({ default: false })
  disabled!: boolean;
}

export type ScreenItemDocument = ScreenItemSubdocument & {
  _id: Types.ObjectId;
};

/**
 * Plain (non-hydrated) item shape used when building items to persist. Mongoose
 * casts these into subdocuments on write, so callers never need to hydrate.
 */
export interface ScreenItemValue {
  _id: Types.ObjectId;
  type: ScreenItemType;
  mediaId?: Types.ObjectId;
  playlistId?: Types.ObjectId;
  appInstanceId?: Types.ObjectId;
  order: number;
  duration?: number;
  disabled: boolean;
}

export const ScreenItemSubdocumentSchema = SchemaFactory.createForClass(
  ScreenItemSubdocument,
);

@Schema({ timestamps: true, collection: 'screens' })
export class Screen {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [ScreenItemSubdocumentSchema], default: [] })
  items!: ScreenItemDocument[];

  @Prop({ required: true, default: 0, min: 0 })
  itemCount!: number;

  /** Sum of active (non-disabled) media item durations in seconds. */
  @Prop({ required: true, default: 0, min: 0 })
  totalDuration!: number;

  /** First visible content thumbnail — resolved at read time from media or playlist cover. */
  @Prop({ type: Types.ObjectId, ref: 'MediaItem' })
  coverMediaId?: Types.ObjectId;

  /** Working hours. Absent ⇒ always on (backward compatible for legacy screens). */
  @Prop({ type: ScreenAvailabilitySchema })
  availability?: ScreenAvailability;

  /** Operator opt-out: when true, this screen never raises offline alerts. */
  @Prop({ default: false })
  alertMuted!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ScreenDocument = HydratedDocument<Screen>;

export const ScreenSchema = SchemaFactory.createForClass(Screen);

ScreenSchema.index({ organizationId: 1, updatedAt: -1 });
