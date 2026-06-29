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
    }
  >;
  /** Payload the (single) connector returns each fetch. */
  payload?: unknown;
  /** Stable version (ETag) the connector returns each fetch. */
  version?: string;
}): Built {
  const cacheByKey = new Map(
    Object.entries(options.cache ?? {}).map(([key, value]) => [key, value]),
  );

  const fetchData = jest.fn().mockResolvedValue({
    playerPayload: options.payload ?? { value: 1 },
    ...(options.version ? { version: options.version } : {}),
  });
  // Every instance here uses the `weather` slug → one connector, keyed by
  // location, so distinct locations make distinct cache keys.
  jest.spyOn(registry, 'getConnector').mockReturnValue({
    cacheKey: (config: Record<string, unknown>) =>
      `weather:${String(config.location)}`,
    fetchData,
  });
  jest.spyOn(registry, 'connectorSlugs').mockReturnValue(['weather']);

  const appInstancesRepository = {
    findBySlugs: jest.fn().mockResolvedValue(options.instances),
  };
  const upsertPayload = jest.fn(
    (data: { cacheKey: string; payload: unknown; fetchedAt?: Date }) =>
      Promise.resolve({ ...data }),
  );
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
    recordError: jest.fn().mockResolvedValue(undefined),
  };
  const emit = jest.fn();
  const eventEmitter = { emit };
  // The mocked connector (weather) has no oauth descriptor, so the service
  // never calls resolveConnection here; a stub keeps the constructor happy.
  const connectionsService = {
    resolveConnection: jest.fn(),
  };

  const service = new AppDataService(
    appInstancesRepository as never,
    cacheRepository as never,
    eventEmitter as never,
    connectionsService as never,
  );

  return { service, fetchData, upsertPayload, emit, cacheByKey };
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
