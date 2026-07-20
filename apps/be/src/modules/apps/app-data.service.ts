import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { APP_MANIFESTS } from '@edge/apps';
import type {
  AppConnector,
  AppDataMeta,
  ConnectorLogger,
  ResolvedConnection,
} from '@edge/apps-contract';

import { ConnectionsService } from '../connections/connections.service';
import { AppDataChangedEvent, PlayerEvents } from '../player/player.events';
import { AppDataCacheRepository } from './app-data-cache.repository';
import { AppInstancesRepository } from './app-instances.repository';
import { cacheKeyForInstance } from './connectors/cache-key.util';
import { connectorSlugs, getConnector } from './connectors/connector-registry';
import { AppDataCacheDocument } from './schemas/app-data-cache.schema';

/** One distinct cache key the scheduler may refresh, with a sample config. */
interface DueCandidate {
  cacheKey: string;
  slug: string;
  /** A representative instance config (all instances of a key share output). */
  config: Record<string, unknown>;
  refreshSeconds: number;
}

/** Live-preview connector payload + freshness for a `server` app instance. */
export interface PreviewDataResult {
  data: unknown;
  meta: AppDataMeta | null;
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
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
  ) {}

  /**
   * Where a provider posts its change notifications for this connector, or
   * undefined when the connector declares no `webhookPath` or this deployment
   * has no address a provider could reach.
   *
   * A public base URL is the whole condition, and localhost is not a substitute:
   * the caller here is Google, not a browser. Unset it and the connectors simply
   * don't subscribe and the poll carries the data — which is exactly what should
   * happen on a developer's laptop. `WEBHOOK_PUBLIC_URL` (a dev tunnel) wins over
   * `PUBLIC_API_URL`, matching the Graph subscription service, so push can be
   * exercised locally through cloudflared/ngrok.
   */
  private webhookUrl(connector: AppConnector): string | undefined {
    if (!connector.webhookPath) {
      return undefined;
    }
    const base =
      this.configService.get<string>('webhookPublicUrl') ||
      this.configService.get<string>('publicApiUrl');
    if (!base) {
      return undefined;
    }
    const prefix = this.configService.get<string>('apiPrefix') ?? 'api';
    return `${base.replace(/\/$/, '')}/${prefix}/v1/${connector.webhookPath}`;
  }

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
          pending: Boolean(entry.pending),
        },
      ]),
    );
    const previousByKey = new Map(
      cached.map((entry) => [
        entry.cacheKey,
        {
          payload: entry.payload,
          version: entry.version,
          secrets: entry.secrets,
        },
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
      secrets: existing?.secrets,
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
    state:
      | { lastAttemptAt?: Date; hadError: boolean; pending?: boolean }
      | undefined,
    candidate: DueCandidate,
    now: Date,
  ): boolean {
    const lastAttemptAt = state?.lastAttemptAt;
    if (!lastAttemptAt) {
      return true;
    }
    // An in-flight async job (pending) is re-checked every tick so a slow export
    // completes promptly instead of waiting a full cadence.
    if (state?.pending) {
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
    previous: {
      payload: unknown;
      version?: string;
      secrets?: Record<string, unknown>;
    },
  ): Promise<boolean> {
    try {
      const { saved, version, pending } = await this.performFetch(
        candidate,
        previous.secrets,
      );
      // A pending result kept the last-known payload; nothing changed to fan out.
      if (pending) {
        return false;
      }
      // Prefer the connector's stable version (ETag) when it provides one — so a
      // payload with volatile fields (rotating URLs) doesn't look "changed" every
      // refresh. Fall back to a deep payload compare otherwise.
      if (version !== undefined && previous.version !== undefined) {
        return version !== previous.version;
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
    }
  }

  /**
   * Fetch a candidate's connector once and upsert the result. Shared by the
   * scheduler ({@link refreshOne}) and the live-preview path
   * ({@link getPreviewData}); the timeout + connection resolution live here, the
   * callers own change-detection / error handling. Throws on connector failure.
   */
  private async performFetch(
    candidate: DueCandidate,
    previousSecrets?: Record<string, unknown>,
  ): Promise<{
    saved: AppDataCacheDocument;
    version?: string;
    pending: boolean;
  }> {
    const connector = getConnector(candidate.slug);
    if (!connector) {
      throw new Error(`no connector for slug ${candidate.slug}`);
    }

    const controller = new AbortController();
    // Connectors backed by a slow async job (e.g. Canva mp4 export) can raise
    // their own budget; everything else uses the default.
    const timeout = setTimeout(() => {
      controller.abort();
    }, connector.timeoutMs ?? FETCH_TIMEOUT_MS);

    try {
      // `connected` apps (oauth descriptor present) need a resolved connection
      // with a fresh, decrypted access token; `server` apps have none.
      const connection = connector.oauth
        ? await this.resolveConnection(candidate)
        : undefined;

      const webhookUrl = this.webhookUrl(connector);
      const result = await connector.fetchData(candidate.config, {
        // No organizationId: the runtime is global (the cache is shared across
        // orgs); `connected` apps get tenant identity from `connection`.
        logger: this.connectorLogger,
        signal: controller.signal,
        ...(connection ? { connection } : {}),
        // Feed the connector its previously-persisted state (e.g. an in-flight
        // export job, or a live push channel) so it can resume instead of blocking
        // and renew instead of re-subscribing.
        ...(previousSecrets ? { secrets: previousSecrets } : {}),
        ...(webhookUrl ? { webhookUrl } : {}),
      });

      // A pending result means an async job is still running: persist the new
      // job state and keep the last-known payload on screen (no fan-out).
      if (result.pending && result.playerPayload === undefined) {
        const saved = await this.cacheRepository.upsertPending(
          candidate.cacheKey,
          candidate.slug,
          candidate.refreshSeconds,
          result.secrets,
        );
        return { saved, pending: true };
      }

      const saved = await this.cacheRepository.upsertPayload({
        cacheKey: candidate.cacheKey,
        slug: candidate.slug,
        payload: result.playerPayload,
        fetchedAt: new Date(),
        refreshSeconds: candidate.refreshSeconds,
        ...(result.version ? { version: result.version } : {}),
        ...(result.secrets ? { secrets: result.secrets } : {}),
      });

      return {
        saved,
        pending: false,
        ...(result.version !== undefined ? { version: result.version } : {}),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Resolve the connector payload for an app instance's *live preview*, given a
   * draft config. Returns `{ data: null, meta: null }` for `static` apps (no
   * connector / no cache key). For `server`/`connected` apps it serves the shared
   * cache when fresh (so previewing a city/feed real screens already use is an
   * instant hit), else fetches once. On fetch failure it falls back to the
   * last-known payload flagged `stale`, or null when there's nothing cached.
   */
  async getPreviewData(
    slug: string,
    config: Record<string, unknown>,
  ): Promise<PreviewDataResult> {
    const connector = getConnector(slug);
    if (!connector?.cacheKey) {
      return { data: null, meta: null };
    }

    let cacheKey: string;
    try {
      cacheKey = connector.cacheKey(config);
    } catch {
      return { data: null, meta: null };
    }
    if (!cacheKey) {
      return { data: null, meta: null };
    }

    const refreshSeconds = this.refreshSecondsFor(slug) ?? 900;
    const candidate: DueCandidate = { cacheKey, slug, config, refreshSeconds };

    const [existing] = await this.cacheRepository.findByCacheKeys([cacheKey]);

    // Serve the shared cache when it's a fresh success (age within cadence).
    if (
      existing?.payload !== undefined &&
      !existing.lastError &&
      existing.fetchedAt &&
      Date.now() - existing.fetchedAt.getTime() < refreshSeconds * 1000
    ) {
      return this.toPreviewResult(existing.payload, existing.fetchedAt, false);
    }

    try {
      const { saved, pending } = await this.performFetch(
        candidate,
        existing?.secrets,
      );
      // An async job is still running: keep the last-known payload (if any) and
      // flag `pending` so the preview polls until the export finishes.
      if (pending) {
        return this.toPreviewResult(
          saved.payload,
          saved.fetchedAt,
          false,
          true,
        );
      }
      return this.toPreviewResult(saved.payload, saved.fetchedAt, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Preview fetch failed for ${cacheKey}: ${message}`);
      // Fall back to the last-known-good payload, flagged stale; null otherwise.
      if (existing?.payload !== undefined) {
        return this.toPreviewResult(existing.payload, existing.fetchedAt, true);
      }
      return { data: null, meta: null };
    }
  }

  private toPreviewResult(
    payload: unknown,
    fetchedAt: Date | undefined,
    stale: boolean,
    pending = false,
  ): PreviewDataResult {
    return {
      data: payload ?? null,
      meta: {
        ...(fetchedAt ? { fetchedAt: fetchedAt.toISOString() } : {}),
        stale,
        ...(pending ? { pending: true } : {}),
      },
    };
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
