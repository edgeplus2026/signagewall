import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { APP_MANIFESTS } from '@edge/apps';
import type { ConnectorLogger, ResolvedConnection } from '@edge/apps-contract';

import { ConnectionsService } from '../connections/connections.service';
import { AppDataChangedEvent, PlayerEvents } from '../player/player.events';
import { AppDataCacheRepository } from './app-data-cache.repository';
import { AppInstancesRepository } from './app-instances.repository';
import { cacheKeyForInstance } from './connectors/cache-key.util';
import { connectorSlugs, getConnector } from './connectors/connector-registry';

/** One distinct cache key the scheduler may refresh, with a sample config. */
interface DueCandidate {
  cacheKey: string;
  slug: string;
  /** A representative instance config (all instances of a key share output). */
  config: Record<string, unknown>;
  refreshSeconds: number;
}

/** Upper bound on concurrent upstream fetches per refresh cycle. */
const MAX_CONCURRENT_FETCHES = 10;
/** Hard cap on a single connector fetch, so one slow feed can't wedge a cycle. */
const FETCH_TIMEOUT_MS = 15_000;
/**
 * Retry floor after a failed fetch. A key whose last attempt errored is re-tried
 * once this has elapsed even if its normal cadence is longer, so a transient
 * outage clears quickly without waiting a full (e.g. 15-min) refresh window.
 */
const ERROR_RETRY_SECONDS = 120;

@Injectable()
export class AppDataService {
  private readonly logger = new Logger(AppDataService.name);

  constructor(
    private readonly appInstancesRepository: AppInstancesRepository,
    private readonly cacheRepository: AppDataCacheRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
  ) {}

  /**
   * One refresh cycle: collect the distinct cache keys in active use, fetch the
   * due ones once each (bounded concurrency), persist, and fan out the keys
   * whose payload changed. Returns the number of keys actually fetched (for
   * tests / observability).
   */
  async refreshDue(now: Date = new Date()): Promise<number> {
    const candidates = await this.collectDistinctCandidates();
    if (candidates.length === 0) {
      return 0;
    }

    const cached = await this.cacheRepository.findByCacheKeys(
      candidates.map((candidate) => candidate.cacheKey),
    );
    const stateByKey = new Map(
      cached.map((entry) => [
        entry.cacheKey,
        {
          // `lastAttemptAt` (last try, success or fail) drives due-selection;
          // older entries predate it, so fall back to `fetchedAt` (last success).
          lastAttemptAt: entry.lastAttemptAt ?? entry.fetchedAt,
          hadError: Boolean(entry.lastError),
        },
      ]),
    );
    const previousByKey = new Map(
      cached.map((entry) => [
        entry.cacheKey,
        { payload: entry.payload, version: entry.version },
      ]),
    );

    const due = candidates.filter((candidate) =>
      this.isDue(stateByKey.get(candidate.cacheKey), candidate, now),
    );

    let fetched = 0;
    await this.mapBounded(due, MAX_CONCURRENT_FETCHES, async (candidate) => {
      const changed = await this.refreshOne(
        candidate,
        previousByKey.get(candidate.cacheKey) ?? { payload: undefined },
      );
      fetched += 1;
      if (changed) {
        this.eventEmitter.emit(PlayerEvents.AppDataChanged, {
          cacheKey: candidate.cacheKey,
          slug: candidate.slug,
        } satisfies AppDataChangedEvent);
      }
    });

    return fetched;
  }

  /**
   * Force-refresh a single cache key now (bypassing the due check), then fan out
   * if the payload changed. Used by the webhook live-sync path so a provider
   * change notification updates the screen immediately. No-op when no active
   * instance resolves to `cacheKey`.
   */
  async refreshCacheKey(cacheKey: string): Promise<boolean> {
    const candidate = (await this.collectDistinctCandidates()).find(
      (entry) => entry.cacheKey === cacheKey,
    );
    if (!candidate) {
      return false;
    }
    const [existing] = await this.cacheRepository.findByCacheKeys([cacheKey]);
    const changed = await this.refreshOne(candidate, {
      payload: existing?.payload,
      version: existing?.version,
    });
    if (changed) {
      this.eventEmitter.emit(PlayerEvents.AppDataChanged, {
        cacheKey: candidate.cacheKey,
        slug: candidate.slug,
      } satisfies AppDataChangedEvent);
    }
    return changed;
  }

  /**
   * Enumerate every active `server`-app instance and reduce it to the distinct
   * set of cache keys (one fetch serves all instances sharing a key). The first
   * instance seen for a key supplies the representative config.
   */
  private async collectDistinctCandidates(): Promise<DueCandidate[]> {
    const instances =
      await this.appInstancesRepository.findBySlugs(connectorSlugs());
    const byKey = new Map<string, DueCandidate>();
    for (const instance of instances) {
      const cacheKey = cacheKeyForInstance(instance);
      if (!cacheKey || byKey.has(cacheKey)) {
        continue;
      }
      const refreshSeconds = this.refreshSecondsFor(instance.appSlug);
      if (refreshSeconds === undefined) {
        continue;
      }
      byKey.set(cacheKey, {
        cacheKey,
        slug: instance.appSlug,
        config: instance.config,
        refreshSeconds,
      });
    }
    return [...byKey.values()];
  }

  private refreshSecondsFor(slug: string): number | undefined {
    return APP_MANIFESTS.find((manifest) => manifest.slug === slug)
      ?.refreshSeconds;
  }

  /**
   * Whether a key should be fetched this cycle. A key with a healthy last fetch
   * waits its manifest cadence; a key whose last attempt *errored* retries on a
   * shorter floor ({@link ERROR_RETRY_SECONDS}) so a transient upstream blip
   * recovers in ~2 min instead of after a full (e.g. 15-min) cadence — while
   * still bounding how hard we hammer a persistently broken feed.
   */
  private isDue(
    state: { lastAttemptAt?: Date; hadError: boolean } | undefined,
    candidate: DueCandidate,
    now: Date,
  ): boolean {
    const lastAttemptAt = state?.lastAttemptAt;
    if (!lastAttemptAt) {
      return true;
    }
    const cadenceSeconds = state?.hadError
      ? Math.min(candidate.refreshSeconds, ERROR_RETRY_SECONDS)
      : candidate.refreshSeconds;
    const ageMs = now.getTime() - lastAttemptAt.getTime();
    return ageMs >= cadenceSeconds * 1000;
  }

  /**
   * Fetch + persist a single key; returns true when the payload changed versus
   * `previousPayload` (the value loaded for this cycle), so the caller fans out
   * only on real changes.
   */
  private async refreshOne(
    candidate: DueCandidate,
    previous: { payload: unknown; version?: string },
  ): Promise<boolean> {
    const connector = getConnector(candidate.slug);
    if (!connector) {
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      // `connected` apps (oauth descriptor present) need a resolved connection
      // with a fresh, decrypted access token; `server` apps have none.
      const connection = connector.oauth
        ? await this.resolveConnection(candidate)
        : undefined;

      const result = await connector.fetchData(candidate.config, {
        // No organizationId: the runtime is global (the cache is shared across
        // orgs); `connected` apps get tenant identity from `connection`.
        logger: this.connectorLogger,
        signal: controller.signal,
        ...(connection ? { connection } : {}),
      });

      const saved = await this.cacheRepository.upsertPayload({
        cacheKey: candidate.cacheKey,
        slug: candidate.slug,
        payload: result.playerPayload,
        fetchedAt: new Date(),
        refreshSeconds: candidate.refreshSeconds,
        ...(result.version ? { version: result.version } : {}),
      });

      // Prefer the connector's stable version (ETag) when it provides one — so a
      // payload with volatile fields (rotating URLs) doesn't look "changed" every
      // refresh. Fall back to a deep payload compare otherwise.
      if (result.version !== undefined && previous.version !== undefined) {
        return result.version !== previous.version;
      }
      return !this.payloadsEqual(previous.payload, saved.payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Connector fetch failed for ${candidate.cacheKey}: ${message}`,
      );
      await this.cacheRepository.recordError(
        candidate.cacheKey,
        candidate.slug,
        candidate.refreshSeconds,
        message,
      );
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private payloadsEqual(a: unknown, b: unknown): boolean {
    // Canonical (key-sorted) serialization so a payload that's semantically
    // identical but emitted with a different key order doesn't look "changed"
    // and trigger a needless fan-out.
    return stableStringify(a) === stableStringify(b);
  }

  /**
   * Resolve the OAuth connection a `connected` candidate fetches with, from the
   * `connectionId` stored in its config. Throws (→ recorded as a fetch error)
   * when the instance has no connection or it can't be resolved.
   */
  private async resolveConnection(
    candidate: DueCandidate,
  ): Promise<ResolvedConnection> {
    const connectionId = candidate.config.connectionId;
    if (typeof connectionId !== 'string' || !connectionId) {
      throw new Error('connected app has no connectionId');
    }
    return this.connectionsService.resolveConnection(connectionId);
  }

  /** Structured logger handed to connectors (bridges to the Nest logger). */
  private get connectorLogger(): ConnectorLogger {
    return {
      debug: (message, meta) => this.logger.debug(message, meta),
      warn: (message, meta) => this.logger.warn(message, meta),
      error: (message, meta) => this.logger.error(message, meta),
    };
  }

  /** Run `task` over `items` with at most `limit` in flight at once. */
  private async mapBounded<T>(
    items: T[],
    limit: number,
    task: (item: T) => Promise<void>,
  ): Promise<void> {
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(limit, items.length) },
      async () => {
        while (cursor < items.length) {
          const index = cursor;
          cursor += 1;
          await task(items[index]);
        }
      },
    );
    await Promise.all(workers);
  }
}

/**
 * JSON serialization with object keys sorted recursively, so two structurally
 * equal payloads always produce the same string regardless of key insertion
 * order. Arrays keep their order (order is significant there).
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
