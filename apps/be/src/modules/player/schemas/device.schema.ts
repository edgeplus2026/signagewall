import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  DEFAULT_DAILY_RELOAD_TIME,
  ORIENTATIONS,
  SCALES,
  type DeviceOrientation as DeviceOrientationValue,
  type DeviceScale as DeviceScaleValue,
  type DeviceUpdateStatus as DeviceUpdateStatusValue,
  type PlayerRuntime,
} from '@signagewall/player-contract';

export { DEFAULT_DAILY_RELOAD_TIME };

export enum DeviceStatus {
  UNPAIRED = 'unpaired',
  PAIRED = 'paired',
}

/**
 * How the player rotates its output relative to the physical display. A const
 * object (not a TS `enum`) so the value type IS the shared-contract string union
 * — keeping `.LANDSCAPE` member access and `@IsEnum`/`@Prop` validation while
 * staying assignable to `@signagewall/player-contract` payloads. The allowed values
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
 *
 * Kiosk lockdown used to live here. It doesn't any more: it is set on the device,
 * in the player's service menu, and the backend never sees it. Documents written
 * before that still carry a stray `settings.kioskMode` — harmless, since nothing
 * reads it and Mongoose drops unknown paths on the next write.
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

/**
 * Live health the player reports on every heartbeat — what the screen is DOING,
 * as opposed to the stable facts around it. Every field is optional: a player too
 * old to report one omits it, and the CMS then shows nothing rather than a zero
 * that would read as a fault.
 */
@Schema({ _id: false })
export class DeviceDiagnostics {
  /** Media URLs the service-worker cache holds, out of `totalMedia`. */
  @Prop()
  cachedMedia?: number;

  @Prop()
  totalMedia?: number;

  /** Whether the last warm-up pass finished with the whole set stored. */
  @Prop()
  cacheComplete?: boolean;

  /** Free bytes on the device's data partition. Absent off a native shell. */
  @Prop()
  freeDiskBytes?: number;

  /** Whether a service worker actually controls the page — false means nothing
   *  is being cached, however healthy everything else looks. */
  @Prop()
  serviceWorkerControlled?: boolean;

  /** How many times the shell has had to put the player back on screen. Only
   *  climbs, so a screen that struggled overnight is still visible by morning. */
  @Prop()
  recoveries?: number;

  /** Breadcrumb from the last uncaught crash, and when it happened. */
  @Prop({ trim: true })
  lastCrash?: string;

  @Prop()
  lastCrashAt?: number;
}

export const DeviceDiagnosticsSchema =
  SchemaFactory.createForClass(DeviceDiagnostics);

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

  @Prop({ type: DeviceDiagnosticsSchema })
  diagnostics?: DeviceDiagnostics;

  /**
   * Android only: Device Owner provisioning. A kiosk lock only actually holds
   * when this is true; without it the shell degrades to escapable screen-pinning.
   * Stored for fleet visibility only — the kiosk switch itself lives on the
   * device. Undefined on a browser/desktop, and on shells too old to report it.
   */
  @Prop()
  deviceOwner?: boolean;
}

export const DeviceProfileSchema = SchemaFactory.createForClass(DeviceProfile);

/**
 * A physical display device, bound 1:1 to a Screen. In this product a screen IS
 * the player: there is no separate "player pulls a screen" indirection like the
 * legacy (one screen → many players). The `deviceId` is a stable UUID the
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

  /** Display + power settings (orientation, scale, daily reload). */
  @Prop({ type: DeviceSettingsSchema, default: () => ({}) })
  settings!: DeviceSettings;

  @Prop({ type: DeviceProfileSchema })
  profile?: DeviceProfile;

  /**
   * What the native shell last said on its OWN channel, independent of the page.
   *
   * Kept apart from `profile` on purpose. That one is what the player page
   * reports; this one is what the shell reports, and the whole value of the
   * second is that it can disagree with the first — a shell reporting health while the
   * page has said nothing for an hour is the signature of a broken web deploy,
   * and merging them would erase exactly that.
   */
  @Prop({ type: Object })
  shellStatus?: Record<string, unknown>;

  /** When that report arrived (ISO). Its own field so a stale shell is legible. */
  @Prop({ trim: true })
  shellStatusAt?: string;

  /**
   * Commands waiting for the shell to collect on its next poll. Handed over once
   * and cleared: a queued `restart` that survived being taken would re-fire on
   * every boot, which is a reboot loop dressed as a feature.
   */
  @Prop({ type: [String], default: undefined })
  shellCommands?: string[];

  /**
   * Whether to ask the shell for its event log next time. Set by an operator in
   * the CMS and cleared when the log arrives.
   */
  @Prop()
  shellWantsLog?: boolean;

  /**
   * The last on-demand diagnostics report, as sent. Schemaless on purpose: it is
   * written by a player that may be newer than this backend, and the value of a
   * report is that it carries whatever that version knew — a strict schema would
   * silently drop the field that explains the fault. Size is capped by the
   * service before it ever reaches here.
   */
  @Prop({ type: Object })
  diagnosticsReport?: Record<string, unknown>;

  createdAt!: Date;
  updatedAt!: Date;
}

export type DeviceDocument = HydratedDocument<Device>;

export const DeviceSchema = SchemaFactory.createForClass(Device);
