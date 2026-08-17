import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * A named set of content, so a report can be read the way it is sold.
 *
 * Playback is recorded per item, because that is what a screen can honestly
 * report. But nobody buys an item — they buy a campaign, and a campaign is
 * usually several files: a landscape cut, a portrait cut, three language
 * variants. Reported item by item, one campaign arrives as six rows that the
 * operator has to add up by hand every time, and getting that addition wrong is
 * a billing error nobody can see.
 *
 * Deliberately NOT a playlist. A playlist is where content sits, and content
 * moves; a campaign is who it belongs to, and that does not change when somebody
 * reorders a rotation. Membership is a plain list of content ids for the same
 * reason the buckets key on content rather than playlist slots.
 */
@Schema({ timestamps: true, collection: 'campaigns' })
export class Campaign {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name!: string;

  /**
   * Optional run dates, 'YYYY-MM-DD'.
   *
   * Advisory only: the report never hides playback that falls outside them. A
   * campaign that ran a week longer than it was booked is exactly the kind of
   * thing an operator needs to see, not something the report should quietly
   * clip to match the paperwork.
   */
  @Prop({ trim: true, maxlength: 10 })
  startDate?: string;

  @Prop({ trim: true, maxlength: 10 })
  endDate?: string;

  /**
   * Media items and app instances that belong to this campaign, by the same id
   * the player reports as `contentId`.
   */
  @Prop({ type: [String], default: [] })
  contentIds!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type CampaignDocument = HydratedDocument<Campaign>;

export const CampaignSchema = SchemaFactory.createForClass(Campaign);

/** One name per organization, so two people cannot create rival duplicates. */
CampaignSchema.index({ organizationId: 1, name: 1 }, { unique: true });

/**
 * Reverse lookup: "which campaign does this content belong to".
 *
 * The report resolves thousands of content ids per request and would otherwise
 * scan every campaign in the organization for each one.
 */
CampaignSchema.index({ organizationId: 1, contentIds: 1 });
