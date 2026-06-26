import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum DeviceStatus {
  UNPAIRED = 'unpaired',
  PAIRED = 'paired',
}

/** Hardware/runtime profile reported by the player at connect time. */
@Schema({ _id: false })
export class DeviceProfile {
  @Prop({ trim: true })
  platform?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ trim: true })
  appVersion?: string;

  @Prop()
  screenWidth?: number;

  @Prop()
  screenHeight?: number;
}

export const DeviceProfileSchema = SchemaFactory.createForClass(DeviceProfile);

/**
 * A physical display device, bound 1:1 to a Screen. In this product a screen IS
 * the player: there is no separate "player pulls a screen" indirection like the
 * legacy Castit (one screen → many players). The `deviceId` is a stable UUID the
 * player persists locally; the opaque pairing token (stored hashed) authorizes
 * reconnects without re-pairing.
 */
@Schema({ timestamps: true, collection: 'devices' })
export class Device {
  @Prop({ required: true, unique: true, index: true })
  deviceId!: string;

  /** Short human code shown on the unpaired display; cleared once paired. */
  @Prop({ index: true, unique: true, sparse: true })
  pairingCode?: string;

  /** Logical expiry for the pairing code (validated on pair; not a TTL delete). */
  @Prop()
  pairingCodeExpiresAt?: Date;

  @Prop({
    type: String,
    enum: DeviceStatus,
    required: true,
    default: DeviceStatus.UNPAIRED,
  })
  status!: DeviceStatus;

  /** The bound screen. Unique+sparse enforces the 1:1 screen↔device invariant. */
  @Prop({
    type: Types.ObjectId,
    ref: 'Screen',
    index: true,
    unique: true,
    sparse: true,
  })
  screenId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true })
  organizationId?: Types.ObjectId;

  /** SHA-256 of the opaque device token. The raw token is never stored. */
  @Prop({ index: true, sparse: true })
  tokenHash?: string;

  @Prop()
  lastSeenAt?: Date;

  @Prop({ default: false })
  online!: boolean;

  @Prop({ type: DeviceProfileSchema })
  profile?: DeviceProfile;

  createdAt!: Date;
  updatedAt!: Date;
}

export type DeviceDocument = HydratedDocument<Device>;

export const DeviceSchema = SchemaFactory.createForClass(Device);
