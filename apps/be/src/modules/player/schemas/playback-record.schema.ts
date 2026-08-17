import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * How long a day's detail is kept, in days.
 *
 * Ninety days is the reporting window an operator actually works in — last month
 * versus this one, a campaign that ran in the spring. Past that the question
 * changes shape: nobody asks which hour a poster played on a Tuesday last year,
 * they ask how much it ran that year. That question is answered by
 * {@link PlaybackMonth}, which is a fraction of the size and is never deleted.
 *
 * Deleting is not a storage saving so much as a promise: a screen produces a row
 * per item per day forever, and a fleet that keeps every one of them ends up with
 * a collection whose index no longer fits in memory — at which point the reports
 * that matter get slow because of the ones that don't.
 */
export const PLAYBACK_RETENTION_DAYS = 90;

/**
 * What one screen showed of one item on one local calendar day.
 *
 * A bucket, not a log. The device already sums — see the player's playback-log —
 * so a day of playback that would be several thousand events arrives as one row
 * of totals per item, and repeated deliveries add into it with `$inc` rather than
 * appending. That is what makes proof-of-play affordable at five thousand
 * screens: the write volume is bounded by items-per-screen-per-day, not by how
 * often the rotation turns over.
 *
 * The day is the DEVICE's local calendar day. It has to be: a screen in Belgrade
 * and one in Los Angeles do not share a "Tuesday", and the operator asking about
 * Tuesday means the one the screen lived through. The backend never re-derives
 * it — it cannot, without knowing each screen's timezone — it only sanity-checks
 * it against the device's reported clock.
 */
@Schema({ timestamps: true, collection: 'playbackrecords' })
export class PlaybackRecord {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Screen', required: true })
  screenId!: Types.ObjectId;

  /**
   * The media item or app instance that played — what it IS, not where it sat.
   *
   * Deliberately not the playlist slot id: reordering a playlist rewrites slot
   * ids, and a report keyed on those would show a poster's history ending the day
   * somebody dragged it up two places.
   */
  @Prop({ required: true, trim: true, maxlength: 64 })
  contentId!: string;

  /** The device's local calendar day, 'YYYY-MM-DD'. */
  @Prop({ required: true, trim: true, maxlength: 10 })
  day!: string;

  @Prop({ type: String, trim: true, maxlength: 16 })
  kind?: string;

  /** App slug, so a report can name the item without a second lookup. */
  @Prop({ trim: true, maxlength: 64 })
  slug?: string;

  @Prop({ default: 0 })
  plays!: number;

  /** Measured airtime — how long it was actually on screen, not its set duration. */
  @Prop({ default: 0 })
  airtimeMs!: number;

  /**
   * Plays per local hour, as a sparse map ('0'–'23' → count).
   *
   * A map rather than a 24-element array for one practical reason: `$inc` on
   * `hours.9` creates the container by itself, whereas seeding an array of
   * twenty-four zeros on upsert and incrementing into it in the same operation is
   * a path conflict Mongo refuses — which is also why this carries no default. It is also smaller — most screens are dark for
   * a third of the day, and those hours simply never appear.
   */
  @Prop({ type: Object })
  hours!: Record<string, number>;

  /**
   * Measured airtime per local hour ('0'–'23' → milliseconds).
   *
   * The coverage report is built on this rather than on {@link hours}: play
   * counts cannot say how much of an hour had content, and — more importantly —
   * they cannot distinguish a screen frozen on one item for three hours from one
   * that showed it once. Same sparse-map reasoning as above.
   */
  @Prop({ type: Object })
  airtime!: Record<string, number>;

  /** First and last appearance on that day, by the device's clock. */
  @Prop({ type: Date })
  firstAt?: Date;

  @Prop({ type: Date })
  lastAt?: Date;

  /**
   * Set when the device's clock was too far off to trust and the day had to be
   * derived from the measured skew instead.
   *
   * Kept as evidence rather than hidden: a report that quietly relocates a week
   * of playback is worse than one that says which rows it had to reason about.
   */
  @Prop({ default: false })
  clockCorrected!: boolean;

  /** When this row is deleted. Computed from `day`, not from insertion time. */
  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PlaybackRecordDocument = HydratedDocument<PlaybackRecord>;

export const PlaybackRecordSchema =
  SchemaFactory.createForClass(PlaybackRecord);

/**
 * The bucket key, and the reason repeated deliveries add up instead of piling
 * up. Unique so two backend instances handling the same screen cannot create
 * two rows for one day — they collide, and the second becomes an `$inc`.
 */
PlaybackRecordSchema.index(
  { screenId: 1, day: 1, contentId: 1 },
  { unique: true },
);

/** The report query: one organization, one date range, every screen. */
PlaybackRecordSchema.index({ organizationId: 1, day: 1 });

/** Retention. `expireAfterSeconds: 0` means "delete once expiresAt is past". */
PlaybackRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
