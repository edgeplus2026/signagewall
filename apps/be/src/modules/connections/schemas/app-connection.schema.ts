import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum ConnectionProvider {
  GOOGLE = 'google',
  CANVA = 'canva',
  MICROSOFT = 'microsoft',
}

/**
 * A third-party OAuth account connected for a SINGLE app instance so that
 * instance's `connected` app (Canva, Google Calendar, …) can fetch data on its
 * behalf. Ownership is per-instance: each connection belongs to exactly one
 * {@link instanceId} and is deleted when that instance is removed/disconnected,
 * so different instances (even of the same app) can use different accounts.
 * Tokens are stored ENCRYPTED (AES-256-GCM via EncryptionService) and only ever
 * decrypted in memory on the backend — they never reach the player or snapshot.
 */
@Schema({ timestamps: true, collection: 'appconnections' })
export class AppConnection {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /** The app instance that owns this connection (per-instance ownership). */
  @Prop({
    type: Types.ObjectId,
    ref: 'AppInstance',
    required: true,
    index: true,
  })
  instanceId!: Types.ObjectId;

  @Prop({ type: String, enum: ConnectionProvider, required: true })
  provider!: ConnectionProvider;

  /** Human label for the connected account (usually the email). */
  @Prop({ required: true })
  accountLabel!: string;

  /** OAuth scopes granted to this connection. */
  @Prop({ type: [String], default: [] })
  scopes!: string[];

  /** Encrypted access token (envelope string). */
  @Prop({ required: true })
  accessTokenEnc!: string;

  /** Encrypted refresh token, when the provider issued one. */
  @Prop()
  refreshTokenEnc?: string;

  /** When the current access token expires (for proactive refresh). */
  @Prop()
  expiresAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppConnectionDocument = HydratedDocument<AppConnection>;

export const AppConnectionSchema = SchemaFactory.createForClass(AppConnection);

// One connection per instance (per-instance ownership); reconnecting replaces it.
AppConnectionSchema.index({ instanceId: 1 }, { unique: true });
