import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import {
  Screen,
  ScreenAvailability,
  ScreenDocument,
  ScreenItemType,
  ScreenItemValue,
  ScreenLayout,
  ScreenZoneValue,
} from './schemas/screen.schema';

export interface CreateScreenData {
  organizationId: string;
  name: string;
  description?: string;
}

export interface UpdateScreenData {
  name?: string;
  description?: string;
  availability?: ScreenAvailability;
}

export interface ReplaceItemsData {
  items: ScreenItemValue[];
  itemCount: number;
  totalDuration: number;
  coverMediaId?: Types.ObjectId;
}

const SUMMARY_PROJECTION = { items: 0 } as const;

@Injectable()
export class ScreensRepository {
  constructor(
    @InjectModel(Screen.name)
    private readonly screenModel: Model<ScreenDocument>,
  ) {}

  async findAllSummariesByOrganization(
    organizationId: string,
  ): Promise<ScreenDocument[]> {
    return this.screenModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .select(SUMMARY_PROJECTION)
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<ScreenDocument | null> {
    return this.screenModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  /**
   * Resolves only the owning organization of a screen, looked up by id alone
   * (no org scope). Used by the player gateway's preview path, which receives a
   * bare screenId from the CMS iframe and must discover its org before checking
   * the operator's membership. Returns null if the screen does not exist.
   */
  async findOrganizationIdById(id: string): Promise<string | null> {
    const screen = await this.screenModel
      .findOne({ _id: new Types.ObjectId(id) })
      .select({ organizationId: 1 })
      .lean()
      .exec();

    return screen ? screen.organizationId.toString() : null;
  }

  async findSummaryById(
    organizationId: string,
    id: string,
  ): Promise<ScreenDocument | null> {
    return this.screenModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .select(SUMMARY_PROJECTION)
      .exec();
  }

  async create(data: CreateScreenData): Promise<ScreenDocument> {
    const [screen] = await this.screenModel.create([
      {
        organizationId: new Types.ObjectId(data.organizationId),
        name: data.name,
        ...(data.description ? { description: data.description } : {}),
        items: [],
        itemCount: 0,
        totalDuration: 0,
      },
    ]);

    return screen;
  }

  /**
   * Patches top-level screen fields. `touch: false` skips the automatic
   * `updatedAt` bump — used for config-only changes (e.g. availability) that
   * must not invalidate the content editor's optimistic lock, which is keyed on
   * `updatedAt`.
   */
  async updateById(
    organizationId: string,
    id: string,
    data: UpdateScreenData,
    options: { touch?: boolean } = {},
  ): Promise<ScreenDocument | null> {
    return this.screenModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: data },
        { new: true, timestamps: options.touch ?? true },
      )
      .select(SUMMARY_PROJECTION)
      .exec();
  }

  /**
   * Atomically replaces a screen's items and derived counters, guarded by the
   * `expectedUpdatedAt` the caller observed. Returns `null` when no document
   * matches the guard (i.e. the screen changed concurrently), which the
   * service maps to a 409 conflict.
   */
  async replaceItems(
    organizationId: string,
    id: string,
    expectedUpdatedAt: Date,
    derived: ReplaceItemsData,
  ): Promise<ScreenDocument | null> {
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

    return this.screenModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
          updatedAt: expectedUpdatedAt,
        },
        update,
        { new: true },
      )
      .exec();
  }

  /**
   * Atomically replaces a screen's split-screen zones, guarded like
   * {@link replaceItems}: `null` on a concurrent change (service maps to 409).
   * The service passes the FULL zones array (it merged the edited zone into the
   * zones it loaded under the same guard, so nothing can be lost).
   */
  async setZones(
    organizationId: string,
    id: string,
    expectedUpdatedAt: Date,
    zones: ScreenZoneValue[],
  ): Promise<ScreenDocument | null> {
    return this.screenModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
          updatedAt: expectedUpdatedAt,
        },
        { $set: { zones } },
        { new: true },
      )
      .exec();
  }

  /** Sets the split-screen layout preset. */
  async setLayout(
    organizationId: string,
    id: string,
    layout: ScreenLayout,
  ): Promise<ScreenDocument | null> {
    return this.screenModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: { layout } },
        { new: true },
      )
      .exec();
  }

  /** Summaries (no embedded items) for a set of ids, scoped to the org. */
  async findSummariesByIds(
    organizationId: string,
    ids: string[],
  ): Promise<ScreenDocument[]> {
    return this.screenModel
      .find({
        _id: { $in: ids.map((itemId) => new Types.ObjectId(itemId)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .select(SUMMARY_PROJECTION)
      .exec();
  }

  /**
   * Atomically appends items to a screen and bumps the derived counters.
   * `setCoverMediaId` is only passed when the screen was previously empty.
   */
  async appendItems(
    organizationId: string,
    id: string,
    items: ScreenItemValue[],
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

    await this.screenModel
      .updateOne(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        update,
      )
      .exec();
  }

  async findContainingMediaIds(
    organizationId: string,
    mediaIds: string[],
    session?: ClientSession,
  ): Promise<ScreenDocument[]> {
    if (mediaIds.length === 0) {
      return [];
    }

    const mediaObjectIds = mediaIds.map((id) => new Types.ObjectId(id));
    const query = this.screenModel.find({
      organizationId: new Types.ObjectId(organizationId),
      $or: [
        {
          items: {
            $elemMatch: {
              type: ScreenItemType.MEDIA,
              mediaId: { $in: mediaObjectIds },
            },
          },
        },
        { coverMediaId: { $in: mediaObjectIds } },
      ],
    });

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  async findContainingAppInstanceIds(
    organizationId: string,
    appInstanceIds: string[],
    session?: ClientSession,
  ): Promise<ScreenDocument[]> {
    if (appInstanceIds.length === 0) {
      return [];
    }

    const appObjectIds = appInstanceIds.map((id) => new Types.ObjectId(id));
    const query = this.screenModel.find({
      organizationId: new Types.ObjectId(organizationId),
      items: {
        $elemMatch: {
          type: ScreenItemType.APP,
          appInstanceId: { $in: appObjectIds },
        },
      },
    });

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  async findContainingPlaylistIds(
    organizationId: string,
    playlistIds: string[],
    session?: ClientSession,
  ): Promise<ScreenDocument[]> {
    if (playlistIds.length === 0) {
      return [];
    }

    const playlistObjectIds = playlistIds.map((id) => new Types.ObjectId(id));
    const query = this.screenModel.find({
      organizationId: new Types.ObjectId(organizationId),
      items: {
        $elemMatch: {
          type: ScreenItemType.PLAYLIST,
          playlistId: { $in: playlistObjectIds },
        },
      },
    });

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  async updateDerivedItemsWithoutLock(
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

    const query = this.screenModel.updateOne(
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

  async deleteMany(organizationId: string, ids: string[]): Promise<number> {
    const result = await this.screenModel
      .deleteMany({
        _id: { $in: ids.map((itemId) => new Types.ObjectId(itemId)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();

    return result.deletedCount;
  }

  async findExistingIds(
    organizationId: string,
    ids: string[],
  ): Promise<string[]> {
    const docs = await this.screenModel
      .find({
        _id: { $in: ids.map((itemId) => new Types.ObjectId(itemId)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .select({ _id: 1 })
      .exec();

    return docs.map((doc) => doc._id.toString());
  }
}
