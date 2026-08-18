import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum MediaItemType {
  FOLDER = 'folder',
  IMAGE = 'image',
  VIDEO = 'video',
}

/**
 * Where an item came from. This is PROVENANCE on rows already written, so a
 * value stays even after the importer that produced it is gone: `google_photos`
 * is no longer offered (the picker was dropped rather than pay for its
 * sensitive Google scope), but items imported through it must keep reading back
 * as what they are.
 */
export enum MediaItemSource {
  LOCAL = 'local',
  GOOGLE_DRIVE = 'google_drive',
  /** Retired importer; kept so historical rows stay valid. */
  GOOGLE_PHOTOS = 'google_photos',
  ONEDRIVE = 'onedrive',
  SHAREPOINT = 'sharepoint',
  DROPBOX = 'dropbox',
  PEXELS = 'pexels',
}

export enum MediaItemStatus {
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Schema({ timestamps: true, collection: 'mediaitems' })
export class MediaItem {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MediaItem', default: null, index: true })
  parentId!: Types.ObjectId | null;

  @Prop({ required: true, enum: MediaItemType })
  type!: MediaItemType;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  mimeType?: string;

  @Prop()
  size?: number;

  @Prop({ trim: true })
  storageKey?: string;

  @Prop({ trim: true })
  thumbnailSmallKey?: string;

  @Prop({ trim: true })
  thumbnailLargeKey?: string;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  defaultDuration?: number;

  @Prop({
    required: true,
    enum: MediaItemSource,
    default: MediaItemSource.LOCAL,
  })
  source!: MediaItemSource;

  @Prop({
    required: true,
    enum: MediaItemStatus,
    default: MediaItemStatus.READY,
  })
  status!: MediaItemStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  uploadedBy?: Types.ObjectId;

  @Prop({ trim: true })
  processingError?: string;

  /** Number of thumbnail-processing attempts made so far (retry bookkeeping). */
  @Prop({ default: 0 })
  processingAttempts!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type MediaItemDocument = HydratedDocument<MediaItem>;

export const MediaItemSchema = SchemaFactory.createForClass(MediaItem);

// Folder names must be unique within a parent (per org). Partial filter keeps
// the constraint folder-only, so files may freely share names in a folder.
MediaItemSchema.index(
  { organizationId: 1, parentId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { type: MediaItemType.FOLDER },
  },
);
MediaItemSchema.index({ organizationId: 1, parentId: 1, createdAt: -1 });
MediaItemSchema.index({ organizationId: 1, status: 1 });
// Drives the reconciliation sweep for items stuck mid-processing.
MediaItemSchema.index({ status: 1, updatedAt: 1 });
