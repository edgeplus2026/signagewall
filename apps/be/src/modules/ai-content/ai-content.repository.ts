import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import type {
  AiGeneratedContent,
  AiGenerationInput,
} from '@edge/apps-contract';

import {
  AiGeneration,
  AiGenerationDocument,
  AiGenerationStatus,
} from './schemas/ai-generation.schema';

export interface CreateAiGenerationData {
  organizationId: string;
  userId: string;
  input: AiGenerationInput;
}

@Injectable()
export class AiContentRepository {
  constructor(
    @InjectModel(AiGeneration.name)
    private readonly model: Model<AiGenerationDocument>,
  ) {}

  async create(data: CreateAiGenerationData): Promise<AiGenerationDocument> {
    const [doc] = await this.model.create([
      {
        organizationId: new Types.ObjectId(data.organizationId),
        userId: new Types.ObjectId(data.userId),
        input: data.input,
        status: AiGenerationStatus.QUEUED,
      },
    ]);
    return doc;
  }

  /** Internal lookup by id (used by the worker; not org/user scoped). */
  async findById(id: string): Promise<AiGenerationDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  /** A user's recent generations in an org (newest first) — the history table. */
  async listForUser(
    organizationId: string,
    userId: string,
    limit = 20,
  ): Promise<AiGenerationDocument[]> {
    return this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /** Org + user scoped lookup for the poll and materialize endpoints. */
  async findByIdScoped(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<AiGenerationDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  /** Delete a user's generation (history entry). Leaves any created playlist intact. */
  async deleteForUser(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.model
      .deleteOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    return result.deletedCount > 0;
  }

  /** Count generations a user has created since `since` (daily-limit check). */
  async countForUserSince(userId: string, since: Date): Promise<number> {
    return this.model
      .countDocuments({
        userId: new Types.ObjectId(userId),
        createdAt: { $gte: since },
      })
      .exec();
  }

  async markProcessing(id: string, jobId?: string): Promise<void> {
    await this.model
      .updateOne(
        { _id: new Types.ObjectId(id) },
        {
          $set: {
            status: AiGenerationStatus.PROCESSING,
            ...(jobId ? { jobId } : {}),
          },
        },
      )
      .exec();
  }

  async markSucceeded(
    id: string,
    data: { result: AiGeneratedContent; provider: string; model: string },
  ): Promise<void> {
    await this.model
      .updateOne(
        { _id: new Types.ObjectId(id) },
        {
          $set: {
            status: AiGenerationStatus.SUCCEEDED,
            result: data.result,
            provider: data.provider,
            model: data.model,
          },
          $unset: { error: '' },
        },
      )
      .exec();
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.model
      .updateOne(
        { _id: new Types.ObjectId(id) },
        { $set: { status: AiGenerationStatus.FAILED, error } },
      )
      .exec();
  }

  /**
   * Atomically claims a succeeded, not-yet-materialized generation by stamping
   * its `playlistId`. Returns false when another materialization already won
   * (guarding against double playlist creation). Runs inside the caller's
   * transaction so a lost claim rolls back the instances/playlist it created.
   */
  async claimForMaterialization(
    id: string,
    organizationId: string,
    playlistId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    const query = this.model.updateOne(
      {
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
        status: AiGenerationStatus.SUCCEEDED,
        playlistId: { $exists: false },
      },
      { $set: { playlistId } },
    );
    if (session) {
      query.session(session);
    }
    const result = await query.exec();
    return result.modifiedCount > 0;
  }
}
