import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  AppDataCache,
  AppDataCacheDocument,
} from './schemas/app-data-cache.schema';

export interface UpsertCacheData {
  cacheKey: string;
  slug: string;
  payload: unknown;
  fetchedAt: Date;
  refreshSeconds: number;
  version?: string;
  /** Private connector state to persist (job id, etc.); never sent to players. */
  secrets?: Record<string, unknown>;
}

@Injectable()
export class AppDataCacheRepository {
  constructor(
    @InjectModel(AppDataCache.name)
    private readonly model: Model<AppDataCacheDocument>,
  ) {}

  /** Load cache entries for the given keys (player snapshot resolution). */
  async findByCacheKeys(cacheKeys: string[]): Promise<AppDataCacheDocument[]> {
    const uniqueKeys = [...new Set(cacheKeys)];
    if (uniqueKeys.length === 0) {
      return [];
    }
    return this.model.find({ cacheKey: { $in: uniqueKeys } }).exec();
  }

  /**
   * The entry whose connector is subscribed under this push-channel id.
   *
   * This is how an incoming provider notification — which knows nothing about us
   * except the channel id we handed it — finds its way back to a cache key. The id is
   * a UUID we generated and only the provider was ever told, so matching one is also
   * what authenticates the ping: a stranger POSTing to the endpoint has nothing to
   * match with.
   */
  async findByChannelId(
    channelId: string,
  ): Promise<AppDataCacheDocument | null> {
    return this.model.findOne({ 'secrets.channel.id': channelId }).exec();
  }

  /**
   * Upsert a freshly-fetched payload, clearing any prior error. Returns the
   * saved document so the caller can compare against the previous payload to
   * decide whether to fan out.
   */
  async upsertPayload(data: UpsertCacheData): Promise<AppDataCacheDocument> {
    const updated = await this.model.findOneAndUpdate(
      { cacheKey: data.cacheKey },
      {
        $set: {
          slug: data.slug,
          payload: data.payload,
          // A success advances both timestamps together.
          fetchedAt: data.fetchedAt,
          lastAttemptAt: data.fetchedAt,
          refreshSeconds: data.refreshSeconds,
          ...(data.version ? { version: data.version } : {}),
          // A final result clears the in-flight-job state and pending flag.
          secrets: data.secrets ?? null,
          pending: false,
        },
        $unset: { lastError: '' },
      },
      { new: true, upsert: true },
    );
    return updated;
  }

  /**
   * Record that a connector's async job is still in progress: persist the new
   * connector `secrets` (job id, etc.) and mark the entry pending, but KEEP the
   * last-known payload/version/fetchedAt so the screen doesn't blank while the
   * job runs. Only `lastAttemptAt` advances. Returns the saved document.
   */
  async upsertPending(
    cacheKey: string,
    slug: string,
    refreshSeconds: number,
    secrets: Record<string, unknown> | undefined,
  ): Promise<AppDataCacheDocument> {
    return this.model.findOneAndUpdate(
      { cacheKey },
      {
        $set: {
          slug,
          refreshSeconds,
          lastAttemptAt: new Date(),
          pending: true,
          secrets: secrets ?? null,
        },
        $unset: { lastError: '' },
      },
      { new: true, upsert: true },
    );
  }

  /**
   * Record a failed fetch attempt without clobbering the last good payload or
   * its `fetchedAt`: only `lastAttemptAt` (and `lastError`) advance, so the
   * player keeps showing the last-known-good data with an honest age and the
   * scheduler retries on the error-backoff floor.
   */
  async recordError(
    cacheKey: string,
    slug: string,
    refreshSeconds: number,
    message: string,
  ): Promise<void> {
    await this.model.updateOne(
      { cacheKey },
      {
        $set: {
          slug,
          refreshSeconds,
          lastError: message,
          lastAttemptAt: new Date(),
          // A failed attempt ends any in-flight job so a retry re-creates it.
          pending: false,
        },
        $unset: { secrets: '' },
      },
      { upsert: true },
    );
  }
}
