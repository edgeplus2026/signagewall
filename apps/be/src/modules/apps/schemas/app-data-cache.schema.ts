import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

/**
 * Cached connector output for a `server`/`connected` app, keyed by the
 * connector's coarse `cacheKey` (e.g. `weather:belgrade`, `rss:<hash>`,
 * `fx:eur`). The cache is GLOBAL — one entry per cacheKey for the whole system,
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
   * attempt, so the player can show an accurate "as of …" age for the data it's
   * still displaying.
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

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppDataCacheDocument = HydratedDocument<AppDataCache>;

export const AppDataCacheSchema = SchemaFactory.createForClass(AppDataCache);
