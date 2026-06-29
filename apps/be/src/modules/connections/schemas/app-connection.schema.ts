import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum ConnectionProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
}

/**
 * A third-party OAuth account an organization connected so its `connected` apps
 * (Google Calendar, Slides, …) can fetch data on its behalf. Tokens are stored
 * ENCRYPTED (AES-256-GCM via EncryptionService) and only ever decrypted in
 * memory on the backend — they never reach the player payload or the snapshot.
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

AppConnectionSchema.index({ organizationId: 1, provider: 1 });
