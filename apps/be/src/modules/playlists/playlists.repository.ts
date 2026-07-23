import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import {
  Playlist,
  PlaylistDocument,
  PlaylistItemType,
  PlaylistItemValue,
} from './schemas/playlist.schema';

export interface CreatePlaylistData {
  organizationId: string;
  name: string;
  description?: string;
}

export interface UpdatePlaylistData {
  name?: string;
  description?: string;
}

export interface ReplaceItemsData {
  items: PlaylistItemValue[];
  itemCount: number;
  totalDuration: number;
  coverMediaId?: Types.ObjectId;
}

const SUMMARY_PROJECTION = { items: 0 } as const;

@Injectable()
export class PlaylistsRepository {
  constructor(
    @InjectModel(Playlist.name)
    private readonly playlistModel: Model<PlaylistDocument>,
  ) {}

  async findAllSummariesByOrganization(
    organizationId: string,
  ): Promise<PlaylistDocument[]> {
    return this.playlistModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .select(SUMMARY_PROJECTION)
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<PlaylistDocument | null> {
    return this.playlistModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  async findSummaryById(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ): Promise<PlaylistDocument | null> {
    const query = this.playlistModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .select(SUMMARY_PROJECTION);

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  async create(data: CreatePlaylistData): Promise<PlaylistDocument> {
    const [playlist] = await this.playlistModel.create([
      {
        organizationId: new Types.ObjectId(data.organizationId),
        name: data.name,
        ...(data.description ? { description: data.description } : {}),
        items: [],
        itemCount: 0,
        totalDuration: 0,
      },
    ]);

    return playlist;
  }

  async createWithItems(
    data: CreatePlaylistData,
    derived: ReplaceItemsData,
    session?: ClientSession,
  ): Promise<PlaylistDocument> {
    const [playlist] = await this.playlistModel.create(
      [
        {
          organizationId: new Types.ObjectId(data.organizationId),
          name: data.name,
          ...(data.description ? { description: data.description } : {}),
          items: derived.items,
          itemCount: derived.itemCount,
          totalDuration: derived.totalDuration,
          ...(derived.coverMediaId
            ? { coverMediaId: derived.coverMediaId }
            : {}),
        },
      ],
      session ? { session } : {},
    );

    return playlist;
  }

  /**
   * Atomically replaces a playlist's items and derived fields, guarded by the
   * `expectedUpdatedAt` the caller observed. Returns `null` when no document
   * matches the guard (i.e. the playlist changed concurrently), which the
   * service maps to a 409 conflict.
   */
  async replaceItems(
    organizationId: string,
    id: string,
    expectedUpdatedAt: Date,
    derived: ReplaceItemsData,
  ): Promise<PlaylistDocument | null> {
    const update: Record<string, unknown> = {
      $set: {
        items: derived.items,
        itemCount: derived.itemCount,
        totalDuration: derived.totalDuration,
      },
    };

    if (derived.coverMediaId) {
      (update.$set as Record<string, unknown>).coverMediaId =
        derived.coverMediaId;
    } else {
      update.$unset = { coverMediaId: '' };
    }

    return this.playlistModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
          updatedAt: expectedUpdatedAt,
        },
        update,
        { returnDocument: 'after' },
      )
      .exec();
  }

  async findExistingIds(
    organizationId: string,
    ids: string[],
  ): Promise<string[]> {
    const docs = await this.playlistModel
      .find({
        _id: { $in: ids.map((itemId) => new Types.ObjectId(itemId)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .select({ _id: 1 })
      .exec();

    return docs.map((doc) => doc._id.toString());
  }

  /** Ids of playlists referencing any of the given media (as an item). */
  async findIdsContainingMedia(
    organizationId: string,
    mediaIds: string[],
  ): Promise<string[]> {
    if (mediaIds.length === 0) {
      return [];
    }

    const docs = await this.playlistModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        'items.mediaId': {
          $in: mediaIds.map((id) => new Types.ObjectId(id)),
        },
      })
      .select({ _id: 1 })
      .exec();

    return docs.map((doc) => doc._id.toString());
  }

  async findIdsContainingAppInstances(
    organizationId: string,
    appInstanceIds: string[],
  ): Promise<string[]> {
    if (appInstanceIds.length === 0) {
      return [];
    }

    const docs = await this.playlistModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        'items.appInstanceId': {
          $in: appInstanceIds.map((id) => new Types.ObjectId(id)),
        },
      })
      .select({ _id: 1 })
      .exec();

    return docs.map((doc) => doc._id.toString());
  }

  /** Summaries (no embedded items) for a set of ids, scoped to the org. */
  async findSummariesByIds(
    organizationId: string,
    ids: string[],
  ): Promise<PlaylistDocument[]> {
    return this.playlistModel
      .find({
        _id: { $in: ids.map((itemId) => new Types.ObjectId(itemId)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .select(SUMMARY_PROJECTION)
      .exec();
  }

  /**
   * Atomically appends items to a playlist and bumps the derived counters.
   * Append is purely additive ($push/$inc), so concurrent appends compose
   * without the lost-update risk of a full-array rewrite. `setCoverMediaId`
   * is only passed when the playlist was previously empty.
   */
  async appendItems(
    organizationId: string,
    id: string,
    items: PlaylistItemValue[],
    addedDuration: number,
    setCoverMediaId?: Types.ObjectId,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      $push: { items: { $each: items } },
      $inc: { itemCount: items.length, totalDuration: addedDuration },
    };

    if (setCoverMediaId) {
      update.$set = { coverMediaId: setCoverMediaId };
    }

    await this.playlistModel
      .updateOne(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        update,
      )
      .exec();
  }

  async updateById(
    organizationId: string,
    id: string,
    data: UpdatePlaylistData,
  ): Promise<PlaylistDocument | null> {
    return this.playlistModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: data },
        { returnDocument: 'after' },
      )
      .select(SUMMARY_PROJECTION)
      .exec();
  }

  async deleteMany(
    organizationId: string,
    ids: string[],
    session?: ClientSession,
  ): Promise<number> {
    const query = this.playlistModel.deleteMany({
      _id: { $in: ids.map((itemId) => new Types.ObjectId(itemId)) },
      organizationId: new Types.ObjectId(organizationId),
    });

    if (session) {
      query.session(session);
    }

    const result = await query.exec();

    return result.deletedCount;
  }

  /**
   * Removes the given media from every playlist that references them (as an item
   * or as the cover) and recomputes each playlist's derived fields. Returns the
   * ids of the playlists that were touched so callers can cascade further (e.g.
   * refresh screen covers that mirror a playlist's cover).
   */
  async removeMediaItems(
    organizationId: string,
    mediaIds: string[],
    session?: ClientSession,
  ): Promise<string[]> {
    if (mediaIds.length === 0) {
      return [];
    }

    const mediaObjectIds = mediaIds.map((id) => new Types.ObjectId(id));
    const query = this.playlistModel.find({
      organizationId: new Types.ObjectId(organizationId),
      $or: [
        { 'items.mediaId': { $in: mediaObjectIds } },
        { coverMediaId: { $in: mediaObjectIds } },
      ],
    });

    if (session) {
      query.session(session);
    }

    const playlists = await query.exec();

    for (const playlist of playlists) {
      // Map hydrated subdocuments to plain values first: spreading a Mongoose
      // EmbeddedDocument copies its internals ($__, _doc, …) rather than the
      // schema fields, which would corrupt the persisted `items` and break the
      // cover recomputation. Pull the fields explicitly, like `duplicate` does.
      const remaining: PlaylistItemValue[] = playlist.items
        .filter(
          (item) =>
            // App items have no mediaId — never purge them. Media items are
            // dropped only when their id is in the purge set.
            !item.mediaId ||
            !mediaObjectIds.some((id) => id.equals(item.mediaId)),
        )
        .map((item) => ({
          _id: item._id,
          type: item.type ?? PlaylistItemType.MEDIA,
          ...(item.mediaId ? { mediaId: item.mediaId } : {}),
          ...(item.appInstanceId ? { appInstanceId: item.appInstanceId } : {}),
          order: item.order,
          duration: item.duration,
          disabled: item.disabled,
        }));
      const normalized = this.normalizeItems(remaining);
      await this.saveNormalizedItems(
        organizationId,
        playlist._id.toString(),
        normalized,
        session,
      );
    }

    return playlists.map((playlist) => playlist._id.toString());
  }

  /**
   * Drop `app` items referencing the given app instances from every playlist
   * that contains them, re-normalizing order/duration. Used when an app instance
   * is deleted, so playlists never keep dangling references. Mirrors
   * {@link removeMediaItems}; app items carry no media cover so no cover refresh
   * is needed. Returns the ids of the playlists that were modified.
   */
  async removeAppInstances(
    organizationId: string,
    appInstanceIds: string[],
    session?: ClientSession,
  ): Promise<string[]> {
    if (appInstanceIds.length === 0) {
      return [];
    }

    const appObjectIds = appInstanceIds.map((id) => new Types.ObjectId(id));
    const query = this.playlistModel.find({
      organizationId: new Types.ObjectId(organizationId),
      'items.appInstanceId': { $in: appObjectIds },
    });

    if (session) {
      query.session(session);
    }

    const playlists = await query.exec();

    for (const playlist of playlists) {
      const remaining: PlaylistItemValue[] = playlist.items
        .filter(
          (item) =>
            // Media items have no appInstanceId — never purge them. App items
            // are dropped only when their instance id is in the purge set.
            !item.appInstanceId ||
            !appObjectIds.some((id) => id.equals(item.appInstanceId)),
        )
        .map((item) => ({
          _id: item._id,
          type: item.type ?? PlaylistItemType.MEDIA,
          ...(item.mediaId ? { mediaId: item.mediaId } : {}),
          ...(item.appInstanceId ? { appInstanceId: item.appInstanceId } : {}),
          order: item.order,
          duration: item.duration,
          disabled: item.disabled,
        }));
      const normalized = this.normalizeItems(remaining);
      await this.saveNormalizedItems(
        organizationId,
        playlist._id.toString(),
        normalized,
        session,
      );
    }

    return playlists.map((playlist) => playlist._id.toString());
  }

  private normalizeItems(items: PlaylistItemValue[]): ReplaceItemsData {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const normalized: PlaylistItemValue[] = sorted.map((item, index) => ({
      ...item,
      order: index,
    }));

    return {
      items: normalized,
      itemCount: normalized.length,
      totalDuration: normalized.reduce(
        (total, item) => total + (item.disabled ? 0 : item.duration),
        0,
      ),
      coverMediaId:
        normalized.find((item) => !item.disabled)?.mediaId ??
        normalized[0]?.mediaId,
    };
  }

  private async saveNormalizedItems(
    organizationId: string,
    id: string,
    derived: ReplaceItemsData,
    session?: ClientSession,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      $set: {
        items: derived.items,
        itemCount: derived.itemCount,
        totalDuration: derived.totalDuration,
      },
    };

    if (derived.coverMediaId) {
      (update.$set as Record<string, unknown>).coverMediaId =
        derived.coverMediaId;
    } else {
      update.$unset = { coverMediaId: '' };
    }

    const query = this.playlistModel.updateOne(
      {
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      },
      update,
    );

    if (session) {
      query.session(session);
    }

    await query.exec();
  }
}
