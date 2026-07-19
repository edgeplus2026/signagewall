import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * A Microsoft Graph change-notification subscription tied to a connected app
 * cache key. When Graph posts a notification for `subscriptionId` (validated by
 * `clientState`), the webhook refreshes `cacheKey` and fans out the new data —
 * so a OneDrive document updates on screen the moment it changes, instead of
 * waiting for the polling cadence.
 */
@Schema({ timestamps: true, collection: 'graphsubscriptions' })
export class GraphSubscription {
  /** The Graph-assigned subscription id (unique). */
  @Prop({ required: true, unique: true })
  subscriptionId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'AppConnection',
    required: true,
    index: true,
  })
  connectionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId!: Types.ObjectId;

  /** The Graph resource being watched, e.g. `/me/drive/items/{id}`. */
  @Prop({ required: true })
  resource!: string;

  /** The connector cache key this subscription should refresh on change. */
  @Prop({ required: true, index: true })
  cacheKey!: string;

  /** Secret echoed back in every notification; we verify it to trust the call. */
  @Prop({ required: true })
  clientState!: string;

  /** When the Graph subscription expires (renewed before this by the cron). */
  @Prop({ required: true })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type GraphSubscriptionDocument = HydratedDocument<GraphSubscription>;

export const GraphSubscriptionSchema =
  SchemaFactory.createForClass(GraphSubscription);
