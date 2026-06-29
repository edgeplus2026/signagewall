import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum PlaylistItemType {
  MEDIA = 'media',
  APP = 'app',
}

@Schema({ _id: true })
export class PlaylistItemSubdocument {
  /**
   * Item kind. Defaults to `media` so playlist documents written before apps
   * existed (which have no `type` field) read back as media items — no data
   * migration needed.
   */
  @Prop({
    type: String,
    enum: PlaylistItemType,
    required: true,
    default: PlaylistItemType.MEDIA,
  })
  type!: PlaylistItemType;

  /** Set for `media` items. */
  @Prop({ type: Types.ObjectId, ref: 'MediaItem' })
  mediaId?: Types.ObjectId;

  /** Set for `app` items. */
  @Prop({ type: Types.ObjectId, ref: 'AppInstance' })
  appInstanceId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  order!: number;

  @Prop({ required: true, min: 1, max: 3600 })
  duration!: number;

  @Prop({ default: false })
  disabled!: boolean;
}

export type PlaylistItemDocument = PlaylistItemSubdocument & {
  _id: Types.ObjectId;
};

/**
 * Plain (non-hydrated) item shape used when building items to persist. Mongoose
 * casts these into subdocuments on write, so callers never need to hydrate.
 */
export interface PlaylistItemValue {
  _id: Types.ObjectId;
  type: PlaylistItemType;
  mediaId?: Types.ObjectId;
  appInstanceId?: Types.ObjectId;
  order: number;
  duration: number;
  disabled: boolean;
}

export const PlaylistItemSubdocumentSchema = SchemaFactory.createForClass(
  PlaylistItemSubdocument,
);

@Schema({ timestamps: true, collection: 'playlists' })
export class Playlist {
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

  @Prop({ type: [PlaylistItemSubdocumentSchema], default: [] })
  items!: PlaylistItemDocument[];

  /** First item's media — thumbnail URL is resolved at read time. */
  @Prop({ type: Types.ObjectId, ref: 'MediaItem' })
  coverMediaId?: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  itemCount!: number;

  /** Sum of active (non-disabled) item durations in seconds. */
  @Prop({ required: true, default: 0, min: 0 })
  totalDuration!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PlaylistDocument = HydratedDocument<Playlist>;

export const PlaylistSchema = SchemaFactory.createForClass(Playlist);

PlaylistSchema.index({ organizationId: 1, updatedAt: -1 });
