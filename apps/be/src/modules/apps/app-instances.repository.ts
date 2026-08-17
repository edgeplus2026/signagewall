import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import type { AppInstanceConfig } from '@signagewall/apps-contract';

import { cacheKeyFor } from './connectors/cache-key.util';
import {
  AppInstance,
  AppInstanceDocument,
} from './schemas/app-instance.schema';

/**
 * The `cacheKey` field for a new document, or nothing at all for a `static` app.
 * Spread rather than assigned so a keyless app never stores an explicit `null`
 * that the sparse index would then have to carry.
 */
function cacheKeyField(
  appSlug: string,
  config: AppInstanceConfig,
): { cacheKey?: string } {
  const key = cacheKeyFor(appSlug, config);
  return key ? { cacheKey: key } : {};
}

export interface CreateInstanceData {
  organizationId: string;
  appId: string;
  appSlug: string;
  name: string;
  config: AppInstanceConfig;
  configVersion: number;
}

@Injectable()
export class AppInstancesRepository {
  constructor(
    @InjectModel(AppInstance.name)
    private readonly model: Model<AppInstanceDocument>,
  ) {}

  async findByOrganization(
    organizationId: string,
    appId?: string,
  ): Promise<AppInstanceDocument[]> {
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (appId && Types.ObjectId.isValid(appId)) {
      filter.appId = new Types.ObjectId(appId);
    }
    return this.model.find(filter).sort({ updatedAt: -1 }).exec();
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<AppInstanceDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  /** Batch lookup scoped to the org (used when resolving screen content). */
  async findByIds(
    organizationId: string,
    ids: string[],
  ): Promise<AppInstanceDocument[]> {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (objectIds.length === 0) {
      return [];
    }

    return this.model
      .find({
        _id: { $in: objectIds },
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  /**
   * Cross-org lookup of every instance of the given app slugs. Used by the
   * connector scheduler and the realtime fan-out, which operate globally (the
   * connector cache is shared across organizations); each returned instance
   * still carries its `organizationId` so downstream pushes stay org-correct.
   */
  async findBySlugs(slugs: string[]): Promise<AppInstanceDocument[]> {
    const uniqueSlugs = [...new Set(slugs)];
    if (uniqueSlugs.length === 0) {
      return [];
    }
    return this.model.find({ appSlug: { $in: uniqueSlugs } }).exec();
  }

  /**
   * The overlay instances (ticker and friends) assigned to one screen.
   *
   * Narrow on purpose. This runs on every snapshot resolution — every content
   * push AND every device connect — and it used to load the organization's
   * ENTIRE instance collection and filter it in JavaScript. After a deploy, when
   * a whole fleet reconnects at once, that was one full-collection read per
   * screen. `config.screens` is an array of screen ids, and Mongo matches an
   * array element with plain equality, so the filter does the work here.
   */
  async findOverlaysForScreen(
    organizationId: string,
    slugs: string[],
    screenId: string,
  ): Promise<AppInstanceDocument[]> {
    const uniqueSlugs = [...new Set(slugs)];
    if (uniqueSlugs.length === 0) {
      return [];
    }
    return this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        appSlug: { $in: uniqueSlugs },
        'config.screens': screenId,
      })
      .exec();
  }

  /**
   * Instances of one app whose resolved connector cache key matches, across every
   * organization — the fan-out set for a refreshed payload.
   *
   * The key is stored on the document (see `cacheKey` in the schema) precisely so
   * this can be an indexed lookup. Before it was, a single weather refresh read
   * every weather instance in the database and compared keys in memory, for each
   * of the dozens of refreshes a minute.
   */
  async findByCacheKey(cacheKey: string): Promise<AppInstanceDocument[]> {
    return this.model.find({ cacheKey }).exec();
  }

  async countForApp(organizationId: string, appId: string): Promise<number> {
    return this.model
      .countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        appId: new Types.ObjectId(appId),
      })
      .exec();
  }

  async create(data: CreateInstanceData): Promise<AppInstanceDocument> {
    const [instance] = await this.model.create([
      {
        organizationId: new Types.ObjectId(data.organizationId),
        appId: new Types.ObjectId(data.appId),
        appSlug: data.appSlug,
        name: data.name,
        config: data.config,
        configVersion: data.configVersion,
        ...cacheKeyField(data.appSlug, data.config),
      },
    ]);
    return instance;
  }

  /**
   * Create several instances at once, optionally within a transaction. Used by
   * the AI content materializer to create one `text` instance per generated
   * slide atomically with the playlist that references them.
   */
  async createMany(
    data: CreateInstanceData[],
    session?: ClientSession,
  ): Promise<AppInstanceDocument[]> {
    if (data.length === 0) {
      return [];
    }
    const docs = data.map((d) => ({
      organizationId: new Types.ObjectId(d.organizationId),
      appId: new Types.ObjectId(d.appId),
      appSlug: d.appSlug,
      name: d.name,
      config: d.config,
      configVersion: d.configVersion,
      ...cacheKeyField(d.appSlug, d.config),
    }));
    // Mongoose requires `ordered: true` when creating multiple docs in a session.
    return this.model.create(docs, session ? { session, ordered: true } : {});
  }

  async updateById(
    organizationId: string,
    id: string,
    data: Partial<Pick<AppInstance, 'name' | 'config' | 'configVersion'>>,
  ): Promise<AppInstanceDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: data },
        { returnDocument: 'after' },
      )
      .exec();
    // An edited config resolves to a different cache key, and the fan-out reads
    // that key from the document. Leaving it stale would send the refreshed
    // payload to the screens showing the OLD config and nothing to the new one.
    if (updated && data.config !== undefined) {
      await this.syncCacheKey(updated);
    }
    return updated;
  }

  /**
   * Brings a document's stored `cacheKey` in line with what its config resolves
   * to now. Writes only on a real difference, and mutates the in-memory document
   * so the caller does not need to re-read.
   */
  private async syncCacheKey(doc: AppInstanceDocument): Promise<void> {
    const next = cacheKeyFor(doc.appSlug, doc.config);
    if ((doc.cacheKey ?? null) === next) {
      return;
    }
    await this.model
      .updateOne(
        { _id: doc._id },
        next ? { $set: { cacheKey: next } } : { $unset: { cacheKey: '' } },
      )
      .exec();
    if (next) {
      doc.cacheKey = next;
    } else {
      doc.set('cacheKey', undefined);
    }
  }

  /**
   * Fills in `cacheKey` for instances written before the field existed.
   *
   * The scheduler and the fan-out select on that field now, so a document
   * missing it would silently never refresh again — the worst possible migration
   * outcome, because nothing errors and screens simply go stale. Runs once at
   * startup, streams rather than loading the collection, and is a no-op on every
   * boot after the first. Returns how many it repaired.
   */
  async backfillCacheKeys(slugs: string[]): Promise<number> {
    const uniqueSlugs = [...new Set(slugs)];
    if (uniqueSlugs.length === 0) {
      return 0;
    }
    const cursor = this.model
      .find({ appSlug: { $in: uniqueSlugs }, cacheKey: { $exists: false } })
      .cursor();

    let repaired = 0;
    for await (const doc of cursor) {
      const key = cacheKeyFor(doc.appSlug, doc.config);
      if (!key) {
        continue;
      }
      await this.model
        .updateOne({ _id: doc._id }, { $set: { cacheKey: key } })
        .exec();
      repaired += 1;
    }
    return repaired;
  }

  /**
   * The distinct cache keys in active use, with one representative config each.
   *
   * An aggregation rather than a fetch-and-reduce: the scheduler asks this every
   * sixty seconds, and the previous version answered it by loading every instance
   * of every connector app — across all organizations — into the API process to
   * compute keys it had just thrown away. `$group` does the deduplication in the
   * database and returns one document per distinct key.
   */
  async distinctCacheKeys(
    slugs: string[],
  ): Promise<
    { cacheKey: string; appSlug: string; config: Record<string, unknown> }[]
  > {
    const uniqueSlugs = [...new Set(slugs)];
    if (uniqueSlugs.length === 0) {
      return [];
    }
    return this.model.aggregate<{
      cacheKey: string;
      appSlug: string;
      config: Record<string, unknown>;
    }>([
      { $match: { appSlug: { $in: uniqueSlugs }, cacheKey: { $ne: null } } },
      {
        $group: {
          _id: '$cacheKey',
          appSlug: { $first: '$appSlug' },
          config: { $first: '$config' },
        },
      },
      { $project: { _id: 0, cacheKey: '$_id', appSlug: 1, config: 1 } },
    ]);
  }

  async deleteById(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const query = this.model.deleteOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });
    if (session) {
      query.session(session);
    }
    const result = await query.exec();
    return result.deletedCount > 0;
  }

  /** All instances of an app for an org (used to cascade-clean on uninstall). */
  async findByApp(
    organizationId: string,
    appId: string,
  ): Promise<AppInstanceDocument[]> {
    if (!Types.ObjectId.isValid(appId)) return [];
    return this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        appId: new Types.ObjectId(appId),
      })
      .exec();
  }

  /** Remove all instances of an app for an org (used when uninstalling). */
  async deleteByApp(
    organizationId: string,
    appId: string,
    session?: ClientSession,
  ): Promise<number> {
    if (!Types.ObjectId.isValid(appId)) return 0;
    const query = this.model.deleteMany({
      organizationId: new Types.ObjectId(organizationId),
      appId: new Types.ObjectId(appId),
    });
    if (session) {
      query.session(session);
    }
    const result = await query.exec();
    return result.deletedCount;
  }
}
