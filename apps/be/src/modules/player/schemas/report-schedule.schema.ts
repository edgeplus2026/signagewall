import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

/**
 * A standing instruction to send the proof-of-play report.
 *
 * The reason this exists rather than "the operator can export whenever they
 * like": a report nobody opens is a report nobody notices is empty. A screen
 * that stopped reporting three weeks ago is invisible until somebody goes
 * looking, and the moment they go looking is usually the moment a client asked a
 * question. A scheduled send puts the coverage number in front of somebody every
 * week whether or not they thought to ask.
 */
@Schema({ timestamps: true, collection: 'reportschedules' })
export class ReportSchedule {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({ default: false })
  enabled!: boolean;

  @Prop({
    type: String,
    enum: ReportFrequency,
    default: ReportFrequency.WEEKLY,
  })
  frequency!: ReportFrequency;

  /** Who receives it. Plain addresses — recipients are usually not users. */
  @Prop({ type: [String], default: [] })
  recipients!: string[];

  /**
   * IANA timezone the send hour is read in. Without it a report timed for the
   * afternoon lands at a different hour depending on the season, and at the
   * wrong end of the day for a customer in another country.
   */
  @Prop({ trim: true, default: 'Europe/Belgrade' })
  timezone!: string;

  /**
   * The last period that was sent, as its own end day ('YYYY-MM-DD').
   *
   * This is the idempotence key, not a timestamp: it says WHICH report went out,
   * so a restart, a retry, or a second backend instance cannot send the same
   * week twice — and a scheduler that was down for a day still recognises that
   * yesterday's report is missing rather than skipping it.
   */
  @Prop({ trim: true })
  lastSentPeriod?: string;

  @Prop({ type: Date })
  lastSentAt?: Date;

  @Prop({ trim: true })
  lastError?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ReportScheduleDocument = HydratedDocument<ReportSchedule>;

export const ReportScheduleSchema =
  SchemaFactory.createForClass(ReportSchedule);

/** The scheduler's own query: every schedule that is switched on. */
ReportScheduleSchema.index({ enabled: 1 });
