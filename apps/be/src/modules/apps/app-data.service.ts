import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { APP_MANIFESTS } from '@signagewall/apps';
import type {
  AppConnector,
  AppDataMeta,
  ConnectorErrorCode,
  ConnectorLogger,
  ResolvedConnection,
} from '@signagewall/apps-contract';
import { isConnectorErrorCode } from '@signagewall/apps-contract';

import { ConnectionsService } from '../connections/connections.service';
import { AppDataChangedEvent, PlayerEvents } from '../player/player.events';
import { AppDataCacheRepository } from './app-data-cache.repository';
import { AppInstancesRepository } from './app-instances.repository';
import { cacheKeyForInstance } from './connectors/cache-key.util';
import {
  classifyConnectorError,
  classifyConnectorMessage,
} from './connectors/_shared/classify-connector-error';
import { connectorSlugs, getConnector } from './connectors/connector-registry';
import { AppDataCacheDocument } from './schemas/app-data-cache.schema';

/** Cap on serialized connector log metadata, so one bad field can't flood a line. */
const LOG_META_MAX_CHARS = 1_000;

/**
 * Render connector log metadata into the message itself.
 *
 * It has to be one line. Nest's logger reads its second argument as a `context`
 * STRING, so handing it an object prints a bare `Object(3) {` and spills the
 * fields across follow-up lines — which a log collector stores as separate,
 * unrelated entries. That is how `drive watch failed` lost the `detail` field
 * carrying Google's own explanation, in production, where it was the only copy.
 */
function serializeLogMeta(meta: Record<string, unknown>): string {
  let text: string;
  try {
    text = JSON.stringify(meta);
  } catch {
    // Circular or otherwise unserializable. The field NAMES still identify which
    // call this was, which beats both a dropped line and "[object Object]".
    text = `{unserializable: ${Object.keys(meta).join(',')}}`;
  }
  return text.length > LOG_META_MAX_CHARS
    ? `${text.slice(0, LOG_META_MAX_CHARS)}…`
    : text;
}

/** One distinct cache key the scheduler may refresh, with a sample config. */
interface DueCandidate {
  cacheKey: string;
  slug: string;
  /** A representative instance config (all instances of a key share output). */
  config: Record<string, unknown>;
  refreshSeconds: number;
  /** Persisted owner expected for scheduler-driven connected fetches. */
  organizationId?: string;
  appInstanceId?: string;
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
/**
 * How long a cache entry may go untouched before it's considered an orphan.
 * The slowest app refreshes daily (`wisdom`, 86 400 s), so seven days is a wide
 * margin over "would have been attempted by now" — nothing in use can reach it.
 */
const STALE_CACHE_DAYS = 7;

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
          pending: Boolean(entry.pending),
          stale: Boolean(entry.lastError),
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
    // Read the cache entry FIRST: it records which app produced this key, which
    // narrows the instance lookup to that one slug instead of enumerating every
    // connector app's instances just to find a single candidate.
    const [existing] = await this.cacheRepository.findByCacheKeys([cacheKey]);
    const candidate = (
      await this.collectDistinctCandidates(
        existing ? [existing.slug] : undefined,
      )
    ).find((entry) => entry.cacheKey === cacheKey);
    if (!candidate) {
      return false;
    }
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
   * Drop connector cache entries nothing references any more. See
   * {@link AppDataCacheRepository.deleteStale} for what makes an entry an
   * orphan; `STALE_CACHE_DAYS` is the margin over the slowest app's cadence.
   */
  async pruneStaleCache(): Promise<number> {
    const cutoff = new Date(Date.now() - STALE_CACHE_DAYS * 86_400_000);
    const removed = await this.cacheRepository.deleteStale(cutoff);
    if (removed > 0) {
      this.logger.log(
        `Pruned ${String(removed)} stale connector cache entries`,
      );
    }
    return removed;
  }

  /**
   * Every cache key some instance still resolves to, right now.
   *
   * Deliberately more permissive than {@link collectDistinctCandidates}: it
   * applies NO readiness filtering (no refresh cadence, no "has a connection
   * yet" check), because its consumers use it to decide what to DELETE. A key
   * missing from this set is treated as garbage, so anything that narrows it
   * turns into deleting live state.
   */
  async liveCacheKeys(): Promise<Set<string>> {
    const instances =
      await this.appInstancesRepository.findBySlugs(connectorSlugs());
    const keys = new Set<string>();
    for (const instance of instances) {
      const cacheKey = cacheKeyForInstance(instance);
      if (cacheKey) {
        keys.add(cacheKey);
      }
    }
    return keys;
  }

  /**
   * Enumerate every active `server`-app instance and reduce it to the distinct
   * set of cache keys (one fetch serves all instances sharing a key). The first
   * instance seen for a key supplies the representative config.
   */
  private async collectDistinctCandidates(
    slugs: string[] = connectorSlugs(),
  ): Promise<DueCandidate[]> {
    // Deduplicated in the database. This used to load every connector app's
    // instances — across all organizations — once a minute, purely to compute
    // keys that were then reduced to a handful of distinct values.
    const groups = await this.appInstancesRepository.distinctCacheKeys(slugs);
    const candidates: DueCandidate[] = [];
    for (const group of groups) {
      const refreshSeconds = this.refreshSecondsFor(
        group.appSlug,
        group.config,
      );
      if (refreshSeconds === undefined) {
        continue;
      }
      // A `connected` instance saved without an account can never fetch — the
      // fetch would throw "connected app has no connectionId" (see
      // {@link resolveConnection}) every cycle, forever, for an instance the
      // operator simply hasn't finished configuring. Skipping it here keeps the
      // scheduler (and the logs) about things that can actually succeed.
      if (this.needsConnection(group.appSlug) && !group.config.connectionId) {
        continue;
      }
      candidates.push({
        cacheKey: group.cacheKey,
        slug: group.appSlug,
        config: group.config,
        refreshSeconds,
        organizationId: group.organizationId,
        appInstanceId: group.appInstanceId,
      });
    }
    return candidates;
  }

  /**
   * Repairs instances written before `cacheKey` was denormalized onto the
   * document. Called once at startup by the scheduler.
   *
   * This is the migration that must not be skipped: selection now happens on
   * that field, so an instance without it would simply never be refreshed again —
   * no error, no log, just screens quietly showing month-old data.
   */
  async backfillCacheKeys(): Promise<number> {
    const repaired =
      await this.appInstancesRepository.backfillCacheKeys(connectorSlugs());
    if (repaired > 0) {
      this.logger.log(
        `Backfilled cacheKey on ${String(repaired)} app instances`,
      );
    }
    return repaired;
  }

  private refreshSecondsFor(
    slug: string,
    config: Record<string, unknown> = {},
  ): number | undefined {
    const configured = getConnector(slug)?.refreshSeconds?.(config);
    if (configured !== undefined) {
      if (!Number.isFinite(configured) || configured < 1) {
        throw new Error(`Invalid connector refresh cadence for ${slug}`);
      }
      return Math.floor(configured);
    }
    return APP_MANIFESTS.find((manifest) => manifest.slug === slug)
      ?.refreshSeconds;
  }

  /** Whether this app's connector fetches on behalf of an OAuth connection. */
  private needsConnection(slug: string): boolean {
    return (
      APP_MANIFESTS.find((manifest) => manifest.slug === slug)?.dataSource ===
      'connected'
    );
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
      pending?: boolean;
      stale?: boolean;
    },
  ): Promise<boolean> {
    try {
      const { saved, changed, pending } = await this.performFetch(
        candidate,
        previous,
      );
      // A pending result kept the last-known payload; fan out only when the
      // pending/stale state itself flipped, so screens update their status.
      if (pending) {
        return (
          previous.pending !== Boolean(saved.pending) ||
          previous.stale !== Boolean(saved.lastError)
        );
      }
      return changed;
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
        classifyConnectorError(error),
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
  /**
   * Whether a fetch produced different content from what was stored.
   *
   * A connector's stable `version` (an ETag) wins when both sides have one, so a
   * payload with volatile fields — rotating signed URLs, a re-stamped generation
   * time — is not read as "changed" on every refresh. Otherwise the payloads are
   * compared canonically.
   */
  private hasChanged(
    previous: { payload?: unknown; version?: string },
    next: { payload: unknown; version?: string },
  ): boolean {
    if (next.version !== undefined && previous.version !== undefined) {
      return next.version !== previous.version;
    }
    return !this.payloadsEqual(previous.payload, next.payload);
  }

  private async performFetch(
    candidate: DueCandidate,
    previous: {
      payload?: unknown;
      version?: string;
      secrets?: Record<string, unknown>;
    } = {},
  ): Promise<{
    saved: AppDataCacheDocument;
    version?: string;
    pending: boolean;
    /** True when the stored content actually moved (drives fan-out + revision). */
    changed: boolean;
  }> {
    const previousSecrets = previous.secrets;
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
          result.error,
          result.error
            ? (result.errorCode ?? classifyConnectorMessage(result.error))
            : undefined,
        );
        return { saved, pending: true, changed: false };
      }

      // Decided BEFORE the write, against what was loaded for this cycle — the
      // upsert overwrites the very values the comparison needs.
      const changed = this.hasChanged(previous, {
        payload: result.playerPayload,
        ...(result.version !== undefined ? { version: result.version } : {}),
      });

      const saved = await this.cacheRepository.upsertPayload({
        cacheKey: candidate.cacheKey,
        slug: candidate.slug,
        payload: result.playerPayload,
        fetchedAt: new Date(),
        refreshSeconds: candidate.refreshSeconds,
        contentChanged: changed,
        ...(result.version ? { version: result.version } : {}),
        ...(result.secrets ? { secrets: result.secrets } : {}),
      });

      return {
        saved,
        pending: false,
        changed,
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

    const refreshSeconds = this.refreshSecondsFor(slug, config) ?? 900;
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
      const { saved, pending, changed } = await this.performFetch(candidate, {
        payload: existing?.payload,
        ...(existing?.version !== undefined
          ? { version: existing.version }
          : {}),
        ...(existing?.secrets ? { secrets: existing.secrets } : {}),
      });
      // An async job is still running: keep the last-known payload (if any) and
      // flag `pending` so the preview polls until the export finishes.
      if (pending) {
        if (
          Boolean(existing?.pending) !== Boolean(saved.pending) ||
          Boolean(existing?.lastError) !== Boolean(saved.lastError)
        ) {
          this.eventEmitter.emit(PlayerEvents.AppDataChanged, {
            cacheKey,
            slug,
          } satisfies AppDataChangedEvent);
        }
        return this.toPreviewResult(
          saved.payload,
          saved.fetchedAt,
          Boolean(saved.lastError),
          true,
          this.savedErrorCode(saved),
        );
      }
      // The preview writes into the SAME global connector cache the players read
      // from, so a fetch it drove to completion has just replaced the payload
      // every screen on this key is showing — fan out exactly like the scheduler
      // does. Without this a slow async export (a Canva video) that the preview's
      // own poll finishes never reaches the players at all: the entry now looks
      // freshly fetched, so the scheduler skips it for a full cadence and then
      // sees an unchanged `version` and stays quiet. The screen would sit on the
      // old design — or the app's "Loading design…" state — until it reconnected.
      if (changed) {
        this.eventEmitter.emit(PlayerEvents.AppDataChanged, {
          cacheKey,
          slug,
        } satisfies AppDataChangedEvent);
      }
      return this.toPreviewResult(saved.payload, saved.fetchedAt, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Preview fetch failed for ${cacheKey}: ${message}`);
      const errorCode = classifyConnectorError(error);
      // Fall back to the last-known-good payload, flagged stale — and even with
      // nothing cached, the operator still gets the failure code: a broken
      // first-time setup must say WHY, not render an empty screen.
      if (existing?.payload !== undefined) {
        return this.toPreviewResult(
          existing.payload,
          existing.fetchedAt,
          true,
          false,
          errorCode,
        );
      }
      return { data: null, meta: { stale: true, errorCode } };
    }
  }

  /** The persisted error classification, revalidated against the allowlist. */
  private savedErrorCode(
    saved: AppDataCacheDocument,
  ): ConnectorErrorCode | undefined {
    if (!saved.lastError) {
      return undefined;
    }
    return isConnectorErrorCode(saved.lastErrorCode)
      ? saved.lastErrorCode
      : classifyConnectorMessage(saved.lastError);
  }

  private toPreviewResult(
    payload: unknown,
    fetchedAt: Date | undefined,
    stale: boolean,
    pending = false,
    errorCode?: ConnectorErrorCode,
  ): PreviewDataResult {
    return {
      data: payload ?? null,
      meta: {
        ...(fetchedAt ? { fetchedAt: fetchedAt.toISOString() } : {}),
        stale,
        ...(pending ? { pending: true } : {}),
        ...(errorCode ? { errorCode } : {}),
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
    const connection =
      await this.connectionsService.resolveConnection(connectionId);
    if (
      (candidate.organizationId &&
        connection.organizationId !== candidate.organizationId) ||
      (candidate.appInstanceId &&
        connection.appInstanceId !== candidate.appInstanceId)
    ) {
      throw new Error('connected app ownership mismatch');
    }
    return connection;
  }

  /**
   * Structured logger handed to connectors (bridges to the Nest logger).
   *
   * Metadata is folded INTO the message — see {@link serializeLogMeta} for why
   * passing it as Nest's second argument silently loses it.
   */
  private get connectorLogger(): ConnectorLogger {
    const line = (message: string, meta?: Record<string, unknown>): string =>
      meta && Object.keys(meta).length > 0
        ? `${message} ${serializeLogMeta(meta)}`
        : message;

    return {
      debug: (message, meta) => this.logger.debug(line(message, meta)),
      warn: (message, meta) => this.logger.warn(line(message, meta)),
      error: (message, meta) => this.logger.error(line(message, meta)),
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
