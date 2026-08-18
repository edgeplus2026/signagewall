import { Types } from 'mongoose';

import { AppDataService } from './app-data.service';
import * as registry from './connectors/connector-registry';

/** A fake `server` app instance document (only the fields the service reads). */
function instance(slug: string, config: Record<string, unknown>) {
  return {
    _id: new Types.ObjectId(),
    appSlug: slug,
    config,
    organizationId: new Types.ObjectId(),
  };
}

interface Built {
  service: AppDataService;
  fetchData: jest.Mock;
  upsertPayload: jest.Mock;
  upsertPending: jest.Mock;
  recordError: jest.Mock;
  emit: jest.Mock;
  cacheByKey: Map<string, { payload: unknown; fetchedAt?: Date }>;
}

function buildService(options: {
  instances: ReturnType<typeof instance>[];
  /** Pre-existing cache entries by key (for due-selection / change tests). */
  cache?: Record<
    string,
    {
      payload: unknown;
      fetchedAt?: Date;
      version?: string;
      lastAttemptAt?: Date;
      lastError?: string;
      pending?: boolean;
      secrets?: Record<string, unknown>;
    }
  >;
  /** Payload the (single) connector returns each fetch. */
  payload?: unknown;
  /** Stable version (ETag) the connector returns each fetch. */
  version?: string;
  /** When true, the connector reports an in-flight async job (pending). */
  pending?: boolean;
  /** Sanitized connector failure accompanying resumable pending state. */
  pendingError?: string;
  /** Optional connector-owned cadence derived from instance config. */
  refreshSeconds?: (config: Record<string, unknown>) => number;
  /** Exercise scheduler ownership checks for a connected connector. */
  connected?: boolean;
  resolvedConnection?: Record<string, unknown>;
}): Built {
  const cacheByKey = new Map(
    Object.entries(options.cache ?? {}).map(([key, value]) => [key, value]),
  );

  const fetchData = jest.fn().mockResolvedValue(
    options.pending
      ? {
          pending: true,
          secrets: { job: { id: 'job-x' } },
          ...(options.pendingError ? { error: options.pendingError } : {}),
        }
      : {
          playerPayload: options.payload ?? { value: 1 },
          ...(options.version ? { version: options.version } : {}),
        },
  );
  // Every instance here uses the `weather` slug → one connector, keyed by
  // location, so distinct locations make distinct cache keys.
  jest.spyOn(registry, 'getConnector').mockReturnValue({
    cacheKey: (config: Record<string, unknown>) =>
      `weather:${String(config.location)}`,
    ...(options.refreshSeconds
      ? { refreshSeconds: options.refreshSeconds }
      : {}),
    ...(options.connected
      ? {
          oauth: {
            provider: 'google',
            authorizationUrl: 'https://accounts.example/authorize',
            tokenUrl: 'https://accounts.example/token',
            scopes: [],
          },
        }
      : {}),
    fetchData,
  });
  jest.spyOn(registry, 'connectorSlugs').mockReturnValue(['weather']);

  const appInstancesRepository = {
    findBySlugs: jest.fn().mockResolvedValue(options.instances),
    // The scheduler now asks the database for the DISTINCT keys rather than
    // reducing a full instance list itself. The fake does that reduction here so
    // the tests keep declaring instances, which is what they are actually about.
    distinctCacheKeys: jest.fn(() => {
      const byKey = new Map<
        string,
        {
          cacheKey: string;
          appSlug: string;
          config: Record<string, unknown>;
          organizationId: string;
          appInstanceId: string;
        }
      >();
      for (const instance of options.instances as {
        _id: Types.ObjectId;
        organizationId: Types.ObjectId;
        appSlug: string;
        config: Record<string, unknown>;
      }[]) {
        const cacheKey = registry
          .getConnector(instance.appSlug)
          ?.cacheKey?.(instance.config);
        if (cacheKey && !byKey.has(cacheKey)) {
          byKey.set(cacheKey, {
            cacheKey,
            appSlug: instance.appSlug,
            config: instance.config,
            // The real aggregation denormalizes the representative instance's
            // owner onto the group; the ownership check depends on it.
            organizationId: instance.organizationId.toString(),
            appInstanceId: instance._id.toString(),
          });
        }
      }
      return Promise.resolve([...byKey.values()]);
    }),
  };
  const upsertPayload = jest.fn(
    (data: { cacheKey: string; payload: unknown; fetchedAt?: Date }) =>
      Promise.resolve({ ...data }),
  );
  const upsertPending = jest.fn(
    (
      cacheKey: string,
      _slug: string,
      _refreshSeconds: number,
      secrets: Record<string, unknown> | undefined,
      error?: string,
    ) =>
      // Preserve the last-known payload (like the real repo does).
      Promise.resolve({
        cacheKey,
        ...(cacheByKey.get(cacheKey) ?? {}),
        pending: true,
        secrets,
        ...(error ? { lastError: error } : {}),
      }),
  );
  const recordError = jest.fn().mockResolvedValue(undefined);
  const cacheRepository = {
    findByCacheKeys: jest.fn((keys: string[]) =>
      Promise.resolve(
        keys
          .map((cacheKey) =>
            cacheByKey.has(cacheKey)
              ? { cacheKey, ...cacheByKey.get(cacheKey) }
              : null,
          )
          .filter(Boolean),
      ),
    ),
    upsertPayload,
    upsertPending,
    recordError,
  };
  const emit = jest.fn();
  const eventEmitter = { emit };
  // The mocked connector (weather) has no oauth descriptor, so the service
  // never calls resolveConnection here; a stub keeps the constructor happy.
  const connectionsService = {
    resolveConnection: jest.fn().mockResolvedValue(options.resolvedConnection),
  };
  // No `publicApiUrl`: these tests are the poll path, and with no public address the
  // service passes no `webhookUrl` and connectors don't subscribe — which is exactly
  // what a machine with no inbound route should do.
  const configService = { get: jest.fn().mockReturnValue(undefined) };

  const service = new AppDataService(
    appInstancesRepository as never,
    cacheRepository as never,
    eventEmitter as never,
    configService as never,
    connectionsService as never,
  );

  return {
    service,
    fetchData,
    upsertPayload,
    upsertPending,
    recordError,
    emit,
    cacheByKey,
  };
}

// The service reads `refreshSeconds` from APP_MANIFESTS; weather is 900s.
const NOW = new Date('2024-03-01T12:00:00Z');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AppDataService.getPreviewData', () => {
  it('returns null data for a static app (no connector)', async () => {
    const { service } = buildService({ instances: [] });
    // Static apps have no connector — override the spy for this case.
    jest.spyOn(registry, 'getConnector').mockReturnValue(undefined);

    await expect(service.getPreviewData('clock', {})).resolves.toEqual({
      data: null,
      meta: null,
    });
  });

  it('serves the shared cache when it is fresh, without fetching', async () => {
    const { service, fetchData } = buildService({
      instances: [],
      payload: { temp: 21 },
      cache: {
        // getPreviewData uses real wall-clock freshness (no injected clock), so
        // the entry must be recent relative to Date.now(), not the fixed NOW.
        'weather:belgrade': {
          payload: { temp: 21 },
          fetchedAt: new Date(Date.now() - 5 * 60_000), // 5 min ago, < 900s
        },
      },
    });

    const result = await service.getPreviewData('weather', {
      location: 'belgrade',
    });

    expect(fetchData).not.toHaveBeenCalled();
    expect(result.data).toEqual({ temp: 21 });
    expect(result.meta?.stale).toBe(false);
  });

  it('fetches once when nothing is cached', async () => {
    const { service, fetchData } = buildService({
      instances: [],
      payload: { temp: 30 },
    });

    const result = await service.getPreviewData('weather', {
      location: 'belgrade',
    });

    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({ temp: 30 });
    expect(result.meta?.stale).toBe(false);
  });

  it('falls back to the last-known payload (stale) when the fetch fails', async () => {
    const { service, fetchData } = buildService({
      instances: [],
      cache: {
        // Stale (older than cadence) so it tries to refresh, then fails.
        'weather:belgrade': {
          payload: { temp: 9 },
          fetchedAt: new Date(NOW.getTime() - 60 * 60_000),
        },
      },
    });
    fetchData.mockRejectedValueOnce(new Error('upstream 500'));

    const result = await service.getPreviewData('weather', {
      location: 'belgrade',
    });

    expect(result.data).toEqual({ temp: 9 });
    expect(result.meta?.stale).toBe(true);
  });
});

describe('AppDataService.refreshDue', () => {
  it('rejects a resolved connection whose persisted owner differs from its instance', async () => {
    const owned = instance('weather', {
      location: 'belgrade',
      connectionId: new Types.ObjectId().toString(),
    });
    const { service, fetchData, recordError } = buildService({
      instances: [owned],
      connected: true,
      resolvedConnection: {
        id: owned.config.connectionId,
        organizationId: new Types.ObjectId().toString(),
        appInstanceId: owned._id.toString(),
        provider: 'google',
        accountLabel: 'foreign',
        accessToken: 'token',
        scopes: [],
      },
    });

    await expect(service.refreshDue(NOW)).resolves.toBe(1);
    expect(fetchData).not.toHaveBeenCalled();
    expect(recordError).toHaveBeenCalledWith(
      'weather:belgrade',
      'weather',
      900,
      'connected app ownership mismatch',
      'upstream_error',
    );
  });

  it('uses a validated connector cadence derived from instance config', async () => {
    const { service, fetchData } = buildService({
      instances: [
        instance('weather', { location: 'belgrade', cadenceSeconds: 300 }),
      ],
      cache: {
        'weather:belgrade': {
          payload: { temp: 20 },
          lastAttemptAt: new Date(NOW.getTime() - 6 * 60_000),
        },
      },
      refreshSeconds: (config) => Number(config.cadenceSeconds),
    });

    await expect(service.refreshDue(NOW)).resolves.toBe(1);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid connector cadence instead of creating a hot loop', async () => {
    const { service, fetchData } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      refreshSeconds: () => 0,
    });

    await expect(service.refreshDue(NOW)).rejects.toThrow(/invalid connector/i);
    expect(fetchData).not.toHaveBeenCalled();
  });

  it('de-dupes: many instances sharing a cache key cost ONE fetch', async () => {
    const { service, fetchData, emit } = buildService({
      instances: [
        instance('weather', { location: 'belgrade' }),
        instance('weather', { location: 'belgrade' }),
        instance('weather', { location: 'belgrade' }),
      ],
    });

    const fetched = await service.refreshDue(NOW);

    expect(fetched).toBe(1);
    expect(fetchData).toHaveBeenCalledTimes(1);
    // First fetch (no prior payload) is a change → one fan-out event.
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('fetches each distinct cache key once', async () => {
    const { service, fetchData } = buildService({
      instances: [
        instance('weather', { location: 'belgrade' }),
        instance('weather', { location: 'nis' }),
        instance('weather', { location: 'nis' }),
      ],
    });

    const fetched = await service.refreshDue(NOW);

    expect(fetched).toBe(2);
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it('skips keys that are not yet due', async () => {
    const { service, fetchData } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      cache: {
        // Fetched 5 min ago; weather cadence is 900s (15 min) → not due.
        'weather:belgrade': {
          payload: { value: 1 },
          fetchedAt: new Date(NOW.getTime() - 5 * 60_000),
        },
      },
    });

    const fetched = await service.refreshDue(NOW);
    expect(fetched).toBe(0);
    expect(fetchData).not.toHaveBeenCalled();
  });

  it('refreshes a key whose cadence has elapsed', async () => {
    const { service, fetchData } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      cache: {
        'weather:belgrade': {
          payload: { value: 1 },
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
        },
      },
    });

    const fetched = await service.refreshDue(NOW);
    expect(fetched).toBe(1);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  /**
   * The regression that cost a 300 s app a full extra minute on every cycle.
   *
   * `lastAttemptAt` is stamped when the fetch COMPLETES, so it always lands a
   * little after the tick that started it. One cadence later the age is a shade
   * under the cadence, a strict `>=` judged the key not due, and — because the
   * scheduler only looks every 60 s — it waited another whole tick. In production
   * that made a 300 s cadence refresh every 360 s, invisibly.
   */
  it('refreshes a key that misses its cadence by a fraction of a tick', async () => {
    const { service, fetchData } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      cache: {
        // 899.5 s old against a 900 s cadence: short by half a second, which is
        // the tick-alignment artefact and not a reason to wait another minute.
        'weather:belgrade': {
          payload: { value: 1 },
          fetchedAt: new Date(NOW.getTime() - (900_000 - 500)),
        },
      },
    });

    const fetched = await service.refreshDue(NOW);
    expect(fetched).toBe(1);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  // The slack must not become a licence to refetch early: a key well inside its
  // cadence is still not due, or the tolerance would just be a shorter cadence.
  it('still skips a key comfortably inside its cadence', async () => {
    const { service, fetchData } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      cache: {
        'weather:belgrade': {
          payload: { value: 1 },
          fetchedAt: new Date(NOW.getTime() - (900_000 - 30_000)),
        },
      },
    });

    const fetched = await service.refreshDue(NOW);
    expect(fetched).toBe(0);
    expect(fetchData).not.toHaveBeenCalled();
  });

  it('retries an errored key on the short floor before its normal cadence', async () => {
    const { service, fetchData } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      cache: {
        // Last attempt failed 5 min ago. Normal cadence is 900s (not due), but
        // the 120s error floor has elapsed → retry early.
        'weather:belgrade': {
          payload: { value: 1 },
          fetchedAt: new Date(NOW.getTime() - 60 * 60_000),
          lastAttemptAt: new Date(NOW.getTime() - 5 * 60_000),
          lastError: 'upstream 500',
        },
      },
    });

    const fetched = await service.refreshDue(NOW);
    expect(fetched).toBe(1);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('does not retry an errored key within the error floor', async () => {
    const { service, fetchData } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      cache: {
        // Failed 1 min ago — inside the 120s floor → still backing off.
        'weather:belgrade': {
          payload: { value: 1 },
          fetchedAt: new Date(NOW.getTime() - 60 * 60_000),
          lastAttemptAt: new Date(NOW.getTime() - 60_000),
          lastError: 'upstream 500',
        },
      },
    });

    const fetched = await service.refreshDue(NOW);
    expect(fetched).toBe(0);
    expect(fetchData).not.toHaveBeenCalled();
  });

  it('does not fan out when the payload is unchanged', async () => {
    const { service, emit } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      payload: { value: 7 },
      cache: {
        'weather:belgrade': {
          payload: { value: 7 },
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
        },
      },
    });

    await service.refreshDue(NOW);
    expect(emit).not.toHaveBeenCalled();
  });

  it('uses the connector version (ETag) for change detection when present', async () => {
    // Same version as cached → no change → no fan-out, even though the payload
    // (a rotating URL) differs every fetch.
    const unchanged = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      payload: { url: 'https://signed/AAA' },
      version: 'etag-1',
      cache: {
        'weather:belgrade': {
          payload: { url: 'https://signed/OLD' },
          version: 'etag-1',
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
        },
      },
    });
    await unchanged.service.refreshDue(NOW);
    expect(unchanged.emit).not.toHaveBeenCalled();

    // Different version → real change → fan out.
    const changed = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      payload: { url: 'https://signed/AAA' },
      version: 'etag-2',
      cache: {
        'weather:belgrade': {
          payload: { url: 'https://signed/AAA' },
          version: 'etag-1',
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
        },
      },
    });
    await changed.service.refreshDue(NOW);
    expect(changed.emit).toHaveBeenCalledTimes(1);
  });

  it('a failing fetch does not throw and records an error', async () => {
    const { service, fetchData, emit } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
    });
    fetchData.mockRejectedValueOnce(new Error('upstream 500'));

    await expect(service.refreshDue(NOW)).resolves.toBe(1);
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('AppDataService async export jobs (pending)', () => {
  it('persists the job and fans out the first transition into pending', async () => {
    const { service, upsertPending, upsertPayload, emit } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      pending: true,
    });

    const fetched = await service.refreshDue(NOW);

    expect(fetched).toBe(1);
    expect(upsertPending).toHaveBeenCalledTimes(1);
    // Pending preserves the last-known payload — never writes a new one…
    expect(upsertPayload).not.toHaveBeenCalled();
    // …but the player needs one push so the first export says "Preparing".
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('player.app.data-changed', {
      cacheKey: 'weather:belgrade',
      slug: 'weather',
    });
  });

  it('re-checks a pending entry every tick (due even within cadence)', async () => {
    const { service, fetchData } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      pending: true,
      cache: {
        'weather:belgrade': {
          payload: { value: 1 },
          // Attempted seconds ago — normally NOT due (900s cadence) — but a
          // pending job is re-checked every tick.
          lastAttemptAt: new Date(NOW.getTime() - 5_000),
          fetchedAt: new Date(NOW.getTime() - 5_000),
          pending: true,
        },
      },
    });

    await service.refreshDue(NOW);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('getPreviewData reports pending and keeps the last-known payload', async () => {
    const { service } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      pending: true,
      cache: {
        'weather:belgrade': {
          payload: { url: 'old' },
          // Stale (older than cadence) so it doesn't short-circuit as fresh.
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
          pending: true,
        },
      },
    });

    const result = await service.getPreviewData('weather', {
      location: 'belgrade',
    });

    expect(result.meta?.pending).toBe(true);
    expect(result.data).toEqual({ url: 'old' });
  });

  it('marks the last-known preview stale when pending carries a sanitized error', async () => {
    const { service, upsertPending, emit } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      pending: true,
      pendingError: 'Upstream export is temporarily unavailable',
      cache: {
        'weather:belgrade': {
          payload: { url: 'old' },
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
          pending: true,
        },
      },
    });

    const result = await service.getPreviewData('weather', {
      location: 'belgrade',
    });

    expect(result.data).toEqual({ url: 'old' });
    expect(result.meta).toMatchObject({ pending: true, stale: true });
    expect(upsertPending).toHaveBeenCalledWith(
      'weather:belgrade',
      'weather',
      900,
      { job: { id: 'job-x' } },
      'Upstream export is temporarily unavailable',
      'upstream_error',
    );
    expect(emit).toHaveBeenCalledTimes(1);
  });

  // The preview shares the global connector cache with real screens, so an async
  // export that its own 4s poll finishes has just replaced what every player on
  // that key is showing. Nothing else would tell them: the entry now looks freshly
  // fetched, so the scheduler skips it for a full cadence and then finds the
  // version unchanged.
  it('getPreviewData fans out when its fetch replaced the shared payload', async () => {
    const { service, emit } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      payload: { url: 'exported' },
      cache: {
        'weather:belgrade': {
          payload: { url: 'old' },
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
          pending: true,
        },
      },
    });

    await service.getPreviewData('weather', { location: 'belgrade' });

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('player.app.data-changed', {
      cacheKey: 'weather:belgrade',
      slug: 'weather',
    });
  });

  it('getPreviewData stays quiet when the payload did not change', async () => {
    const { service, emit } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      payload: { url: 'same' },
      cache: {
        'weather:belgrade': {
          payload: { url: 'same' },
          // Older than the cadence, so it refetches instead of short-circuiting.
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
        },
      },
    });

    await service.getPreviewData('weather', { location: 'belgrade' });

    expect(emit).not.toHaveBeenCalled();
  });

  it('getPreviewData does not fan out while the export is still pending', async () => {
    const { service, emit } = buildService({
      instances: [instance('weather', { location: 'belgrade' })],
      pending: true,
      cache: {
        'weather:belgrade': {
          payload: { url: 'old' },
          fetchedAt: new Date(NOW.getTime() - 20 * 60_000),
          pending: true,
        },
      },
    });

    await service.getPreviewData('weather', { location: 'belgrade' });

    expect(emit).not.toHaveBeenCalled();
  });

  /*
   * Regression: the connector logger used to pass its metadata as the Nest
   * logger's SECOND argument, which Nest reads as a `context` string. An object
   * there printed a bare "Object(3) {" and spilled the fields onto follow-up
   * lines that a log collector files as separate entries — which is how the
   * `detail` of a failed Drive watch, carrying Google's own explanation, became
   * unreadable in production. One warning has to be one line.
   */
  it('folds connector log metadata into the message, with no second argument', () => {
    const { service } = buildService({ instances: [] });
    const warn = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => undefined);

    service['connectorLogger'].warn('drive watch failed', {
      fileId: 'deck-1',
      status: 403,
      detail: 'Unauthorized WebHook callback channel: https://api.example/hook',
    });

    expect(warn).toHaveBeenCalledTimes(1);
    const call = warn.mock.calls[0] as unknown[];
    expect(call).toHaveLength(1);
    const line = String(call[0]);
    expect(line).toContain('drive watch failed');
    expect(line).toContain('Unauthorized WebHook callback channel');
    expect(line).toContain('"status":403');
  });

  it('omits the metadata suffix entirely when there is none', () => {
    const { service } = buildService({ instances: [] });
    const warn = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => undefined);

    service['connectorLogger'].warn('drive watch failed', {});

    expect(String((warn.mock.calls[0] as unknown[])[0])).toBe(
      'drive watch failed',
    );
  });
});
