import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

import type {
  AiGeneratedContent,
  AiGenerationInput,
} from '@signagewall/apps-contract';

export enum AiGenerationStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

/**
 * One AI content generation. This collection is the durable record of the
 * feature: it stores exactly what the user entered in the multi-step form
 * (`input`), the job's lifecycle (`status`), the validated model output
 * (`result`), and the draft playlist created from it (`playlistId`). BullMQ only
 * carries the id — all state lives here so the worker (and a future standalone
 * worker process) can be stateless.
 */
@Schema({ timestamps: true, collection: 'aigenerations' })
export class AiGeneration {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  /** The multi-step form inputs — the record of "what the user entered". */
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  input!: AiGenerationInput;

  @Prop({
    type: String,
    enum: AiGenerationStatus,
    required: true,
    default: AiGenerationStatus.QUEUED,
    index: true,
  })
  status!: AiGenerationStatus;

  /** The validated generated content. Set once `status === succeeded`. */
  @Prop({ type: MongooseSchema.Types.Mixed })
  result?: AiGeneratedContent;

  /** Failure reason. Set once `status === failed`. */
  @Prop()
  error?: string;

  /** Provider/model that produced the result (observability + adapter swap). */
  @Prop()
  provider?: string;

  @Prop()
  model?: string;

  /** BullMQ job id (== generation id); recorded for traceability. */
  @Prop()
  jobId?: string;

  /** The draft playlist materialized from this generation (set once created). */
  @Prop({ type: Types.ObjectId, ref: 'Playlist' })
  playlistId?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AiGenerationDocument = HydratedDocument<AiGeneration>;

export const AiGenerationSchema = SchemaFactory.createForClass(AiGeneration);

// Per-user daily count (limit enforcement) + user history, newest first.
AiGenerationSchema.index({ userId: 1, createdAt: -1 });
// Org history, newest first.
AiGenerationSchema.index({ organizationId: 1, createdAt: -1 });
