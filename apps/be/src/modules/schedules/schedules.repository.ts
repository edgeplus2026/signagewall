import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import {
  Schedule,
  ScheduleDocument,
  ScheduleEventValue,
  ScheduleFit,
  ScheduleContentType,
} from './schemas/schedule.schema';

export interface FillerValue {
  contentType: ScheduleContentType;
  mediaId?: Types.ObjectId;
  playlistId?: Types.ObjectId;
  fit: ScheduleFit;
}

export interface CreateScheduleData {
  organizationId: string;
  name: string;
  description?: string;
  filler?: FillerValue;
}

export interface UpdateScheduleData {
  name?: string;
  description?: string;
  /** `null` clears the filler; an object sets it; `undefined` leaves it. */
  filler?: FillerValue | null;
}

export interface ReplaceEventsData {
  events: ScheduleEventValue[];
  eventCount: number;
}

const SUMMARY_PROJECTION = { events: 0 } as const;

@Injectable()
export class SchedulesRepository {
  constructor(
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
  ) {}

  async findAllSummariesByOrganization(
    organizationId: string,
  ): Promise<ScheduleDocument[]> {
    return this.scheduleModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .select(SUMMARY_PROJECTION)
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<ScheduleDocument | null> {
    return this.scheduleModel
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
  ): Promise<ScheduleDocument | null> {
    const query = this.scheduleModel
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

  async create(data: CreateScheduleData): Promise<ScheduleDocument> {
    const [schedule] = await this.scheduleModel.create([
      {
        organizationId: new Types.ObjectId(data.organizationId),
        name: data.name,
        ...(data.description ? { description: data.description } : {}),
        ...(data.filler ? { filler: data.filler } : {}),
        events: [],
        eventCount: 0,
        screenIds: [],
      },
    ]);
    return schedule;
  }

  async updateById(
    organizationId: string,
    id: string,
    data: UpdateScheduleData,
  ): Promise<ScheduleDocument | null> {
    const set: Record<string, unknown> = {};
    if (data.name !== undefined) {
      set.name = data.name;
    }
    if (data.description !== undefined) {
      set.description = data.description;
    }
    if (data.filler) {
      set.filler = data.filler;
    }

    const update: Record<string, unknown> = {};
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    if (data.filler === null) {
      update.$unset = { filler: '' };
    }

    return this.scheduleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        update,
        { new: true },
      )
      .select(SUMMARY_PROJECTION)
      .exec();
  }

  /**
   * Atomically replaces a schedule's events, guarded by the `expectedUpdatedAt`
   * the caller observed. Returns `null` when no document matches the guard (the
   * schedule changed concurrently), which the service maps to a 409 conflict.
   */
  async replaceEvents(
    organizationId: string,
    id: string,
    expectedUpdatedAt: Date,
    derived: ReplaceEventsData,
  ): Promise<ScheduleDocument | null> {
    return this.scheduleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
          updatedAt: expectedUpdatedAt,
        },
        { $set: { events: derived.events, eventCount: derived.eventCount } },
        { new: true },
      )
      .exec();
  }

  async findExistingIds(
    organizationId: string,
    ids: string[],
  ): Promise<string[]> {
    const docs = await this.scheduleModel
      .find({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        organizationId: new Types.ObjectId(organizationId),
      })
      .select({ _id: 1 })
      .exec();
    return docs.map((doc) => doc._id.toString());
  }

  async deleteMany(
    organizationId: string,
    ids: string[],
    session?: ClientSession,
  ): Promise<number> {
    const query = this.scheduleModel.deleteMany({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
      organizationId: new Types.ObjectId(organizationId),
    });
    if (session) {
      query.session(session);
    }
    const result = await query.exec();
    return result.deletedCount;
  }

  /** Replaces a schedule's assigned-screen cache (reconciled from screen.scheduleId). */
  async setScreenIds(
    organizationId: string,
    id: string,
    screenIds: Types.ObjectId[],
    session?: ClientSession,
  ): Promise<void> {
    const query = this.scheduleModel.updateOne(
      {
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      },
      { $set: { screenIds } },
    );
    if (session) {
      query.session(session);
    }
    await query.exec();
  }

  /** Pulls deleted screens out of every schedule's `screenIds` cache. */
  async removeScreenAssignments(
    organizationId: string,
    screenIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    if (screenIds.length === 0) {
      return;
    }
    const objectIds = screenIds.map((id) => new Types.ObjectId(id));
    const query = this.scheduleModel.updateMany(
      {
        organizationId: new Types.ObjectId(organizationId),
        screenIds: { $in: objectIds },
      },
      { $pull: { screenIds: { $in: objectIds } } },
    );
    if (session) {
      query.session(session);
    }
    await query.exec();
  }

  async findContainingMedia(
    organizationId: string,
    mediaIds: string[],
    session?: ClientSession,
  ): Promise<ScheduleDocument[]> {
    if (mediaIds.length === 0) {
      return [];
    }
    const objectIds = mediaIds.map((id) => new Types.ObjectId(id));
    const query = this.scheduleModel.find({
      organizationId: new Types.ObjectId(organizationId),
      $or: [
        { 'events.mediaId': { $in: objectIds } },
        { 'filler.mediaId': { $in: objectIds } },
      ],
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findContainingPlaylist(
    organizationId: string,
    playlistIds: string[],
    session?: ClientSession,
  ): Promise<ScheduleDocument[]> {
    if (playlistIds.length === 0) {
      return [];
    }
    const objectIds = playlistIds.map((id) => new Types.ObjectId(id));
    const query = this.scheduleModel.find({
      organizationId: new Types.ObjectId(organizationId),
      $or: [
        { 'events.playlistId': { $in: objectIds } },
        { 'filler.playlistId': { $in: objectIds } },
      ],
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Persists a content purge: new events array + count, optionally clearing the
   * filler. Lock-free (used inside the media/playlist delete transaction).
   */
  async applyContentPurge(
    organizationId: string,
    id: string,
    events: ScheduleEventValue[],
    clearFiller: boolean,
    session?: ClientSession,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      $set: { events, eventCount: events.length },
    };
    if (clearFiller) {
      update.$unset = { filler: '' };
    }
    const query = this.scheduleModel.updateOne(
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
