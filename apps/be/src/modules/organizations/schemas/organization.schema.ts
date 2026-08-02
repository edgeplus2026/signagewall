import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({
  timestamps: true,
  collection: 'organizations',
})
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  /**
   * The account that pays for this organization — whoever created it. Plan
   * limits are always resolved through here, never through the member acting:
   * a screen created by an invited colleague still counts against the owner's
   * licences, and a free member of a paid org is covered by that org's plan.
   *
   * Optional only for organizations created before plans existed; the plan
   * migration backfills them from the earliest admin membership, and
   * `PlansService` falls back to that same lookup if one is ever missing.
   */
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  ownerUserId?: Types.ObjectId;

  /**
   * Set when the org is queued for GDPR deletion. A soft-deleted org is hidden
   * from every member immediately; the 30-day sweep physically purges it. `null`
   * (the default) means the org is active.
   */
  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
