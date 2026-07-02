import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { LEGAL_DOC_TYPES } from '../legal.constants';

export type LegalAcceptanceDocument = HydratedDocument<LegalAcceptance>;

/**
 * Append-only record that a user accepted a specific version of a legal
 * document. History is kept (one row per acceptance) so we can prove which
 * version a user agreed to and when — the latest row per `(userId, docType)` is
 * the currently-accepted version.
 */
@Schema({ collection: 'legalacceptances' })
export class LegalAcceptance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: LEGAL_DOC_TYPES, required: true })
  docType: string;

  @Prop({ required: true })
  version: string;

  @Prop({ type: Date, default: Date.now })
  acceptedAt: Date;

  /** Best-effort client IP at acceptance time (audit/compliance). */
  @Prop()
  ip?: string;
}

export const LegalAcceptanceSchema =
  SchemaFactory.createForClass(LegalAcceptance);

// Fast "latest accepted version for this user + doc" lookup.
LegalAcceptanceSchema.index({ userId: 1, docType: 1, acceptedAt: -1 });
