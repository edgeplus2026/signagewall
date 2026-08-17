import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OnboardingProgressDocument = HydratedDocument<OnboardingProgress>;

/**
 * One member's first-run journey through one organization.
 *
 * Only the parts that cannot be derived live here: whether the user closed the
 * checklist, and when they finished it. Which steps are done is always computed
 * from the organization's actual content, so the record can never disagree with
 * reality — it survives content being deleted, and it is right for a colleague
 * invited into an organization that is already set up.
 *
 * Keyed by (user, organization) rather than by user alone because the content
 * the checklist measures is organization-scoped: a second organization is a
 * second setup, and the same user gets a fresh checklist for it.
 */
@Schema({ timestamps: true, collection: 'onboardingprogress' })
export class OnboardingProgress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /** Set when the user closed the checklist for good. `null` ⇒ still showing. */
  @Prop({ type: Date, default: null })
  dismissedAt!: Date | null;

  /** First moment every step was observed done. Never cleared afterwards. */
  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  /**
   * Set once the user has actually seen the "you're all set" state. Until then
   * the checklist stays reachable even though it is complete, so finishing the
   * last step in the background doesn't silently swallow the payoff.
   */
  @Prop({ type: Date, default: null })
  completionAcknowledgedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OnboardingProgressSchema =
  SchemaFactory.createForClass(OnboardingProgress);

/** One record per member per organization; the upsert relies on this. */
OnboardingProgressSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true },
);
