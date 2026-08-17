import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

/**
 * Cached connector output for a `server`/`connected` app, keyed by the
 * connector's coarse `cacheKey` (e.g. `weather:belgrade`). The cache is GLOBAL
 * — one entry per cacheKey for the whole system,
 * shared across organizations — so every instance resolving to the same key
 * shares a single upstream fetch and fan-out. The key is coarse and never
 * carries secrets (server apps are public feeds), which is what makes global
 * sharing safe and maximizes de-duplication.
 */
@Schema({ timestamps: true, collection: 'appdatacache' })
export class AppDataCache {
  /** Connector de-dup key; unique across the whole collection. */
  @Prop({ required: true, unique: true })
  cacheKey!: string;

  /** App slug that produced this entry (for scheduler grouping / fan-out). */
  @Prop({ required: true, index: true })
  slug!: string;

  /** The sanitized, player-safe payload (`ConnectorResult.playerPayload`). */
  @Prop({ type: MongooseSchema.Types.Mixed })
  payload?: unknown;

  /**
   * When {@link payload} was last *successfully* fetched. Unchanged by a failed
   * attempt, so it stays an honest instant for the payload the player is still
   * displaying — which is what lets a bundle anchor that payload in time (the
   * weather bundle derives the forecast place's local clock from it).
   */
  @Prop()
  fetchedAt?: Date;

  /**
   * When a fetch was last *attempted* (success or failure). Drives due-selection
   * and the error-retry backoff, decoupled from `fetchedAt` so a failing feed
   * doesn't masquerade as freshly fetched.
   */
  @Prop()
  lastAttemptAt?: Date;

  /**
   * When the payload last actually CHANGED, as opposed to when it was last
   * re-fetched.
   *
   * The player's snapshot revision is built from this. Using `fetchedAt` meant a
   * feed that answers identically every fifteen minutes still produced a fresh
   * revision each time — so any unrelated push, and every reconnect, handed the
   * device a "new" snapshot for content that had not moved. Every one of those
   * was a full re-resolve on the server and, on the device, a rotation the engine
   * had to decide was the same one.
   */
  @Prop()
  contentAt?: Date;

  /**
   * Optional stable content signature (ETag) from the connector. When set, it —
   * not the payload — decides whether the data changed (for payloads with
   * volatile fields like rotating URLs).
   */
  @Prop()
  version?: string;

  /** Refresh cadence captured from the manifest, for due-selection. */
  @Prop({ required: true })
  refreshSeconds!: number;

  /** Last fetch error message, when the most recent attempt failed. */
  @Prop()
  lastError?: string;

  /**
   * Operator-safe classification of {@link lastError} — one of the fixed
   * allowlisted `ConnectorErrorCode`s. The ONLY error signal that may reach
   * the CMS; the raw message stays server-side.
   */
  @Prop()
  lastErrorCode?: string;

  /**
   * Private connector state (e.g. an in-flight async export job id), persisted
   * server-side and fed back to the connector on the next fetch. NEVER sent to
   * the player (the player resolver reads {@link payload} only).
   */
  @Prop({ type: MongooseSchema.Types.Mixed })
  secrets?: Record<string, unknown>;

  /**
   * True while the connector's async job is still running. A pending entry is
   * re-checked every scheduler tick (not on the normal cadence) and the live
   * preview polls it, so a slow export (e.g. Canva video) completes without
   * blocking a single fetch.
   */
  @Prop()
  pending?: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppDataCacheDocument = HydratedDocument<AppDataCache>;

export const AppDataCacheSchema = SchemaFactory.createForClass(AppDataCache);

/**
 * Resolve a Google push ping to its cache key. `AppDataCacheRepository
 * .findByChannelId` queries this exact path, and it runs once per Drive/Calendar
 * notification — which arrive in bursts while someone is editing a sheet. Without
 * the index that is a collection scan over every cached entry in the deployment,
 * across all orgs and all connectors, per ping.
 *
 * Sparse because only the handful of file/calendar-backed entries ever register a
 * channel; the rest (weather, RSS, crypto…) carry no `secrets.channel` at all.
 */
AppDataCacheSchema.index({ 'secrets.channel.id': 1 }, { sparse: true });
