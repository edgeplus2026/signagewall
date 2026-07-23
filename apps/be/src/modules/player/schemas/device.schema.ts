import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  DEFAULT_DAILY_RELOAD_TIME,
  KIOSK_MODES,
  ORIENTATIONS,
  SCALES,
  type DeviceOrientation as DeviceOrientationValue,
  type DeviceScale as DeviceScaleValue,
  type DeviceUpdateStatus as DeviceUpdateStatusValue,
  type KioskMode as KioskModeValue,
  type PlayerRuntime,
} from '@edge/player-contract';

export { DEFAULT_DAILY_RELOAD_TIME };

export enum DeviceStatus {
  UNPAIRED = 'unpaired',
  PAIRED = 'paired',
}

/**
 * How the player rotates its output relative to the physical display. A const
 * object (not a TS `enum`) so the value type IS the shared-contract string union
 * — keeping `.LANDSCAPE` member access and `@IsEnum`/`@Prop` validation while
 * staying assignable to `@edge/player-contract` payloads. The allowed values
 * (DB + Swagger validation) derive from the contract's `ORIENTATIONS`, so they
 * can never drift.
 */
export const DeviceOrientation = {
  LANDSCAPE: 'landscape',
  LANDSCAPE_FLIPPED: 'landscape-flipped',
  PORTRAIT: 'portrait',
  PORTRAIT_FLIPPED: 'portrait-flipped',
} as const satisfies Record<string, DeviceOrientationValue>;
export type DeviceOrientation = DeviceOrientationValue;

/** How content fits the screen (maps to CSS object-fit on the player). */
export const DeviceScale = {
  NONE: 'none',
  FIT: 'fit',
  STRETCH: 'stretch',
  ZOOM: 'zoom',
} as const satisfies Record<string, DeviceScaleValue>;
export type DeviceScale = DeviceScaleValue;

/**
 * Kiosk lockdown level enforced by a native shell. Const object (not a TS `enum`)
 * so the value type IS the shared-contract union — same pattern as DeviceScale.
 */
export const KioskMode = {
  HARD: 'hard',
  SOFT: 'soft',
  OFF: 'off',
} as const satisfies Record<string, KioskModeValue>;
export type KioskMode = KioskModeValue;

/** Automatic once-a-day player reload, in the device's local time. */
@Schema({ _id: false })
export class DailyReloadSetting {
  @Prop({ default: true })
  enabled!: boolean;

  /** 24h 'HH:mm' in the device's local timezone. */
  @Prop({ default: DEFAULT_DAILY_RELOAD_TIME, trim: true })
  time!: string;
}

export const DailyReloadSettingSchema =
  SchemaFactory.createForClass(DailyReloadSetting);

/**
 * Operator-controlled display + power settings pushed to the player. Grouped
 * under one subdocument so new device controls don't sprawl across top-level
 * scalars. (`volume` predates this and stays top-level for compatibility.)
 */
@Schema({ _id: false })
export class DeviceSettings {
  @Prop({
    type: String,
    enum: ORIENTATIONS,
    default: DeviceOrientation.LANDSCAPE,
  })
  orientation!: DeviceOrientation;

  @Prop({ type: String, enum: SCALES, default: DeviceScale.FIT })
  scale!: DeviceScale;

  @Prop({ type: String, enum: KIOSK_MODES, default: KioskMode.OFF })
  kioskMode!: KioskMode;

  @Prop({ type: DailyReloadSettingSchema, default: () => ({}) })
  dailyReload!: DailyReloadSetting;
}

export const DeviceSettingsSchema =
  SchemaFactory.createForClass(DeviceSettings);

/** Native-shell OTA update status the player reports (absent in a browser). */
@Schema({ _id: false })
export class DeviceUpdateStatus {
  @Prop({ trim: true })
  currentVersion?: string;

  @Prop({ trim: true })
  availableVersion?: string;

  /** ISO timestamp of the last update check. */
  @Prop({ trim: true })
  lastCheckAt?: string;

  /**
   * Typed to the contract's union so the CMS reads a known set of states.
   * Needs an explicit `type: String` — Mongoose can't infer a runtime type
   * from a TS union via reflect-metadata.
   */
  @Prop({ type: String, trim: true })
  lastResult?: DeviceUpdateStatusValue['lastResult'];
}

export const DeviceUpdateStatusSchema =
  SchemaFactory.createForClass(DeviceUpdateStatus);

/** Hardware/runtime profile reported by the player at connect time. */
@Schema({ _id: false })
export class DeviceProfile {
  @Prop({ trim: true })
  platform?: string;

  @Prop({ trim: true })
  userAgent?: string;

  /** Web (PWA) bundle version. */
  @Prop({ trim: true })
  appVersion?: string;

  @Prop()
  screenWidth?: number;

  @Prop()
  screenHeight?: number;

  /** Native shell (Tauri) version — distinct from the web `appVersion`. */
  @Prop({ trim: true })
  shellVersion?: string;

  /**
   * Runtime host the player detected ('tauri' | 'browser' | …). Explicit
   * `type: String` because it's a TS union (Mongoose can't infer it).
   */
  @Prop({ type: String, trim: true })
  runtime?: PlayerRuntime;

  @Prop({ type: DeviceUpdateStatusSchema })
  updateStatus?: DeviceUpdateStatus;
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

  /** Playback volume 0–100, applied by the player to its video audio. */
  @Prop({ default: 100, min: 0, max: 100 })
  volume!: number;

  /** Display + power settings (orientation, scale, kiosk mode, daily reload). */
  @Prop({ type: DeviceSettingsSchema, default: () => ({}) })
  settings!: DeviceSettings;

  @Prop({ type: DeviceProfileSchema })
  profile?: DeviceProfile;

  createdAt!: Date;
  updatedAt!: Date;
}

export type DeviceDocument = HydratedDocument<Device>;

export const DeviceSchema = SchemaFactory.createForClass(Device);
