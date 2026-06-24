import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import {
  Screen,
  ScreenAvailability,
  ScreenDocument,
  ScreenItemType,
  ScreenItemValue,
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

  async updateById(
    organizationId: string,
    id: string,
    data: UpdateScreenData,
  ): Promise<ScreenDocument | null> {
    return this.screenModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: data },
        { new: true },
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

  async deleteMany(
    organizationId: string,
    ids: string[],
    session?: ClientSession,
  ): Promise<number> {
    const query = this.screenModel.deleteMany({
      _id: { $in: ids.map((itemId) => new Types.ObjectId(itemId)) },
      organizationId: new Types.ObjectId(organizationId),
    });

    if (session) {
      query.session(session);
    }

    const result = await query.exec();

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

  /** Current `scheduleId` of each given screen, for schedule (re)assignment. */
  async findScheduleLinksForScreens(
    organizationId: string,
    ids: string[],
    session?: ClientSession,
  ): Promise<Array<{ id: string; scheduleId?: Types.ObjectId }>> {
    if (ids.length === 0) {
      return [];
    }
    const query = this.screenModel
      .find({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .select({ _id: 1, scheduleId: 1 });
    if (session) {
      query.session(session);
    }
    const docs = await query.exec();
    return docs.map((doc) => ({
      id: doc._id.toString(),
      ...(doc.scheduleId ? { scheduleId: doc.scheduleId } : {}),
    }));
  }

  /** Ids of screens currently owned by the given schedule. */
  async findScreenIdsBySchedule(
    organizationId: string,
    scheduleId: string,
    session?: ClientSession,
  ): Promise<string[]> {
    const query = this.screenModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        scheduleId: new Types.ObjectId(scheduleId),
      })
      .select({ _id: 1 });
    if (session) {
      query.session(session);
    }
    const docs = await query.exec();
    return docs.map((doc) => doc._id.toString());
  }

  /** Points the given screens at a schedule (authoritative owner link). */
  async setScreensSchedule(
    organizationId: string,
    ids: string[],
    scheduleId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const query = this.screenModel.updateMany(
      {
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        organizationId: new Types.ObjectId(organizationId),
      },
      { $set: { scheduleId } },
    );
    if (session) {
      query.session(session);
    }
    await query.exec();
  }

  /** Clears the schedule link on screens that currently point at `scheduleId`. */
  async clearScreensSchedule(
    organizationId: string,
    ids: string[],
    scheduleId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const query = this.screenModel.updateMany(
      {
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        organizationId: new Types.ObjectId(organizationId),
        scheduleId,
      },
      { $unset: { scheduleId: '' } },
    );
    if (session) {
      query.session(session);
    }
    await query.exec();
  }

  /** Clears the schedule link on every screen owned by any of the given schedules. */
  async clearScheduleAssignments(
    organizationId: string,
    scheduleIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    if (scheduleIds.length === 0) {
      return;
    }
    const query = this.screenModel.updateMany(
      {
        organizationId: new Types.ObjectId(organizationId),
        scheduleId: { $in: scheduleIds.map((id) => new Types.ObjectId(id)) },
      },
      { $unset: { scheduleId: '' } },
    );
    if (session) {
      query.session(session);
    }
    await query.exec();
  }
}
