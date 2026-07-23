import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import {
  MediaItem,
  MediaItemDocument,
  MediaItemSource,
  MediaItemStatus,
  MediaItemType,
} from './schemas/media-item.schema';

export interface CreateMediaItemData {
  organizationId: string;
  parentId: string | null;
  type: MediaItemType;
  name: string;
  mimeType?: string;
  size?: number;
  storageKey?: string;
  thumbnailSmallKey?: string;
  thumbnailLargeKey?: string;
  width?: number;
  height?: number;
  defaultDuration?: number;
  uploadedBy?: string;
  status?: MediaItemStatus;
  source?: MediaItemSource;
  processingError?: string;
}

export interface UpdateMediaItemData {
  name?: string;
  parentId?: string | null;
  mimeType?: string;
  size?: number;
  storageKey?: string;
  thumbnailSmallKey?: string;
  thumbnailLargeKey?: string;
  width?: number;
  height?: number;
  defaultDuration?: number;
  status?: MediaItemStatus;
  processingError?: string;
  processingAttempts?: number;
}

@Injectable()
export class MediaRepository {
  constructor(
    @InjectModel(MediaItem.name)
    private readonly mediaModel: Model<MediaItemDocument>,
  ) {}

  async findById(
    organizationId: string,
    id: string,
  ): Promise<MediaItemDocument | null> {
    return this.mediaModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  async findByIds(
    organizationId: string,
    ids: string[],
  ): Promise<MediaItemDocument[]> {
    return this.mediaModel
      .find({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  async findAllByOrganization(
    organizationId: string,
  ): Promise<MediaItemDocument[]> {
    return this.mediaModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
  }

  /** Delete every media item for an org (org-erasure cascade). */
  async deleteAllByOrganization(
    organizationId: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.mediaModel
      .deleteMany({ organizationId: new Types.ObjectId(organizationId) })
      .session(session ?? null)
      .exec();
  }

  async findByParent(
    organizationId: string,
    parentId: string | null,
    type?: MediaItemType,
  ): Promise<MediaItemDocument[]> {
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
      parentId: parentId ? new Types.ObjectId(parentId) : null,
    };

    if (type) {
      filter.type = type;
    }

    return this.mediaModel.find(filter).exec();
  }

  async findFolderByName(
    organizationId: string,
    parentId: string | null,
    name: string,
  ): Promise<MediaItemDocument | null> {
    return this.mediaModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        parentId: parentId ? new Types.ObjectId(parentId) : null,
        type: MediaItemType.FOLDER,
        name,
      })
      .exec();
  }

  /**
   * Returns every descendant (files and folders, any depth) of `folderId`
   * using a single `$graphLookup` rather than loading the whole organization
   * into memory.
   */
  async findDescendants(
    organizationId: string,
    folderId: string,
  ): Promise<MediaItemDocument[]> {
    const result = await this.mediaModel
      .aggregate<{ descendants: MediaItem[] }>([
        {
          $match: {
            _id: new Types.ObjectId(folderId),
            organizationId: new Types.ObjectId(organizationId),
          },
        },
        {
          $graphLookup: {
            from: this.mediaModel.collection.name,
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'parentId',
            as: 'descendants',
          },
        },
        { $project: { descendants: 1 } },
      ])
      .exec();

    const descendants = result[0]?.descendants ?? [];
    return descendants.map((doc) => this.mediaModel.hydrate(doc));
  }

  /**
   * Returns the ancestor folders of `folderId` (unordered) via `$graphLookup`,
   * walking parent links upward without scanning the full collection.
   */
  async findAncestorFolders(
    organizationId: string,
    folderId: string,
  ): Promise<MediaItemDocument[]> {
    const result = await this.mediaModel
      .aggregate<{ ancestors: MediaItem[] }>([
        {
          $match: {
            _id: new Types.ObjectId(folderId),
            organizationId: new Types.ObjectId(organizationId),
          },
        },
        {
          $graphLookup: {
            from: this.mediaModel.collection.name,
            startWith: '$parentId',
            connectFromField: 'parentId',
            connectToField: '_id',
            as: 'ancestors',
            restrictSearchWithMatch: { type: MediaItemType.FOLDER },
          },
        },
        { $project: { ancestors: 1 } },
      ])
      .exec();

    const ancestors = result[0]?.ancestors ?? [];
    return ancestors.map((doc) => this.mediaModel.hydrate(doc));
  }

  /**
   * Finds media items stuck in PROCESSING (process died mid-processing, or a
   * transient failure) that are still eligible for a retry. Not org-scoped:
   * the reconciliation sweep runs globally.
   */
  async findStuckProcessing(
    staleBefore: Date,
    maxAttempts: number,
    limit: number,
  ): Promise<MediaItemDocument[]> {
    return this.mediaModel
      .find({
        status: MediaItemStatus.PROCESSING,
        type: { $in: [MediaItemType.IMAGE, MediaItemType.VIDEO] },
        updatedAt: { $lte: staleBefore },
        processingAttempts: { $lt: maxAttempts },
      })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .exec();
  }

  async create(
    data: CreateMediaItemData,
    session?: ClientSession,
  ): Promise<MediaItemDocument> {
    const [item] = await this.mediaModel.create(
      [
        {
          organizationId: new Types.ObjectId(data.organizationId),
          parentId: data.parentId ? new Types.ObjectId(data.parentId) : null,
          type: data.type,
          name: data.name,
          mimeType: data.mimeType,
          size: data.size,
          storageKey: data.storageKey,
          thumbnailSmallKey: data.thumbnailSmallKey,
          thumbnailLargeKey: data.thumbnailLargeKey,
          width: data.width,
          height: data.height,
          defaultDuration: data.defaultDuration,
          uploadedBy: data.uploadedBy
            ? new Types.ObjectId(data.uploadedBy)
            : undefined,
          source: data.source ?? MediaItemSource.LOCAL,
          status: data.status ?? MediaItemStatus.READY,
          processingError: data.processingError,
        },
      ],
      { session },
    );

    return item;
  }

  async updateById(
    organizationId: string,
    id: string,
    data: UpdateMediaItemData,
    session?: ClientSession,
  ): Promise<MediaItemDocument | null> {
    const update: Record<string, unknown> = { ...data };

    if (data.parentId !== undefined) {
      update.parentId = data.parentId
        ? new Types.ObjectId(data.parentId)
        : null;
    }

    return this.mediaModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: update },
        { returnDocument: 'after', session: session ?? null },
      )
      .exec();
  }

  async updateParent(
    organizationId: string,
    ids: string[],
    parentId: string | null,
    session?: ClientSession,
  ): Promise<void> {
    await this.mediaModel
      .updateMany(
        {
          _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
          organizationId: new Types.ObjectId(organizationId),
        },
        {
          $set: {
            parentId: parentId ? new Types.ObjectId(parentId) : null,
          },
        },
        { session: session ?? undefined },
      )
      .exec();
  }

  async deleteMany(
    organizationId: string,
    ids: string[],
    session?: ClientSession,
  ): Promise<void> {
    await this.mediaModel
      .deleteMany({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .session(session ?? null)
      .exec();
  }
}
