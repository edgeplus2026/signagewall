import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** What an event does when it is active. */
export enum ScheduleEventType {
  CONTENT = 'content',
  SCREEN_OFF = 'screen_off',
}

/** Mirrors `ScreenItemType` values — only media and playlists are schedulable. */
export enum ScheduleContentType {
  MEDIA = 'media',
  PLAYLIST = 'playlist',
}

/** How content is scaled to the screen. */
export enum ScheduleFit {
  FIT = 'fit',
  CROP = 'crop',
  STRETCH = 'stretch',
}

/**
 * Closed set of recurrence kinds, mapped to an `RRule` at evaluation time. Kept
 * structured (not a raw RRULE string) so storage stays timezone-naive — the same
 * event resolves against each assigned screen's local timezone.
 */
export enum ScheduleRepeat {
  NONE = 'none', // "Does not repeat"
  DAILY = 'daily', // every day
  WEEKDAYS = 'weekdays', // "Every weekday (Mon–Fri)"
  WEEKLY = 'weekly', // weekly on the start date's weekday
  MONTHLY = 'monthly', // monthly on the start date's day-of-month
  YEARLY = 'yearly', // annually on the start date
}

/**
 * One scheduled event. Times are wall-clock and local to the screen the schedule
 * resolves against. `_id` is enabled so the CMS can address individual events.
 */
@Schema({ _id: true })
export class ScheduleEventSubdocument {
  @Prop({ type: String, enum: ScheduleEventType, required: true })
  type!: ScheduleEventType;

  @Prop({ trim: true })
  name?: string;

  /** Required when `type === CONTENT`. */
  @Prop({ type: String, enum: ScheduleContentType })
  contentType?: ScheduleContentType;

  @Prop({ type: Types.ObjectId, ref: 'MediaItem' })
  mediaId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Playlist' })
  playlistId?: Types.ObjectId;

  /** Content events only. */
  @Prop({ type: String, enum: ScheduleFit, default: ScheduleFit.FIT })
  fit?: ScheduleFit;

  @Prop({ type: String, enum: ScheduleRepeat, required: true })
  repeat!: ScheduleRepeat;

  /** Local 'YYYY-MM-DD'. First occurrence / recurrence anchor (DTSTART). */
  @Prop({ required: true })
  startDate!: string;

  /** Local 'YYYY-MM-DD'. Single-run end / recurrence boundary (UNTIL). */
  @Prop({ required: true })
  endDate!: string;

  /** Local 'HH:mm'. */
  @Prop({ required: true })
  startTime!: string;

  /** Local 'HH:mm'. `endTime <= startTime` means the window crosses midnight. */
  @Prop({ required: true })
  endTime!: string;

  /** Local 'YYYY-MM-DD' occurrences excluded from a recurring series (EXDATE). */
  @Prop({ type: [String], default: [] })
  excludedDates!: string[];

  /** Display + overlap priority; lower wins. */
  @Prop({ required: true, min: 0 })
  order!: number;
}

export type ScheduleEventDocument = ScheduleEventSubdocument & {
  _id: Types.ObjectId;
};

/**
 * Plain (non-hydrated) event shape used when building events to persist. Mongoose
 * casts these into subdocuments on write, so callers never need to hydrate.
 */
export interface ScheduleEventValue {
  _id: Types.ObjectId;
  type: ScheduleEventType;
  name?: string;
  contentType?: ScheduleContentType;
  mediaId?: Types.ObjectId;
  playlistId?: Types.ObjectId;
  fit?: ScheduleFit;
  repeat: ScheduleRepeat;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  excludedDates: string[];
  order: number;
}

export const ScheduleEventSubdocumentSchema = SchemaFactory.createForClass(
  ScheduleEventSubdocument,
);

/** Content shown when no event is active. */
@Schema({ _id: false })
export class ScheduleFiller {
  @Prop({ type: String, enum: ScheduleContentType, required: true })
  contentType!: ScheduleContentType;

  @Prop({ type: Types.ObjectId, ref: 'MediaItem' })
  mediaId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Playlist' })
  playlistId?: Types.ObjectId;

  @Prop({ type: String, enum: ScheduleFit, default: ScheduleFit.FIT })
  fit!: ScheduleFit;
}

export const ScheduleFillerSchema = SchemaFactory.createForClass(ScheduleFiller);

@Schema({ timestamps: true, collection: 'schedules' })
export class Schedule {
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

  @Prop({ type: [ScheduleEventSubdocumentSchema], default: [] })
  events!: ScheduleEventDocument[];

  @Prop({ required: true, default: 0, min: 0 })
  eventCount!: number;

  /** Shown on screens when no event is active. Absent ⇒ screen off when idle. */
  @Prop({ type: ScheduleFillerSchema })
  filler?: ScheduleFiller;

  /**
   * Screens this schedule is assigned to. A reconciled cache of the authoritative
   * `screen.scheduleId`; never written without also setting/clearing that link.
   */
  @Prop({ type: [Types.ObjectId], ref: 'Screen', default: [] })
  screenIds!: Types.ObjectId[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type ScheduleDocument = HydratedDocument<Schedule>;

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);

ScheduleSchema.index({ organizationId: 1, updatedAt: -1 });
ScheduleSchema.index({ organizationId: 1, screenIds: 1 });
