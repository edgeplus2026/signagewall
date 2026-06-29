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
        },
        $unset: { lastError: '' },
      },
      { new: true, upsert: true },
    );
    return updated;
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
        },
      },
      { upsert: true },
    );
  }
}
