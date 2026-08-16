import { GraphWebhookService } from './graph-webhook.service';

function buildService(options: {
  subscriptions?: Record<
    string,
    { clientState: string; cacheKey: string } | undefined
  >;
  /** Rows the orphan sweep / renewal walk. */
  stored?: {
    subscriptionId: string;
    cacheKey: string;
    connectionId?: string;
  }[];
  /** Cache keys instances still resolve to. */
  liveCacheKeys?: string[];
  /** Connections that still exist (default: all of them). */
  missingConnections?: string[];
  publicApiUrl?: string;
  webhookPublicUrl?: string;
}) {
  const refreshCacheKey = jest.fn().mockResolvedValue(true);
  const subscriptionsRepository = {
    findBySubscriptionId: jest.fn((id: string) =>
      Promise.resolve(
        options.subscriptions?.[id]
          ? { subscriptionId: id, ...options.subscriptions[id] }
          : null,
      ),
    ),
    findByCacheKey: jest.fn().mockResolvedValue(null),
    findExpiringBefore: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue(
      (options.stored ?? []).map((row) => ({
        connectionId: row.connectionId ?? 'c1',
        ...row,
      })),
    ),
    updateExpiry: jest.fn(),
    create: jest.fn(),
    deleteBySubscriptionId: jest.fn(),
  };
  const connectionsService = {
    resolveConnection: jest
      .fn()
      .mockResolvedValue({ id: 'c1', accessToken: 'tok' }),
    connectionExists: jest.fn((id: string) =>
      Promise.resolve(!(options.missingConnections ?? []).includes(id)),
    ),
  };
  const configService = {
    get: (key: string) =>
      key === 'publicApiUrl'
        ? options.publicApiUrl
        : key === 'webhookPublicUrl'
          ? options.webhookPublicUrl
          : undefined,
    getOrThrow: () => options.publicApiUrl ?? '',
  };
  const appDataService = {
    refreshCacheKey,
    liveCacheKeys: jest
      .fn()
      .mockResolvedValue(new Set(options.liveCacheKeys ?? [])),
  };

  const service = new GraphWebhookService(
    subscriptionsRepository as never,
    connectionsService as never,
    configService as never,
    appDataService as never,
  );
  return {
    service,
    refreshCacheKey,
    subscriptionsRepository,
    connectionsService,
  };
}

describe('GraphWebhookService.handleNotifications', () => {
  it('refreshes the cache key when clientState matches', async () => {
    const { service, refreshCacheKey } = buildService({
      subscriptions: {
        'sub-1': { clientState: 'secret', cacheKey: 'onedrive:c1:i1' },
      },
    });

    await service.handleNotifications([
      { subscriptionId: 'sub-1', clientState: 'secret' },
    ]);

    expect(refreshCacheKey).toHaveBeenCalledWith('onedrive:c1:i1');
  });

  it('drops a notification whose clientState does not match (spoof guard)', async () => {
    const { service, refreshCacheKey } = buildService({
      subscriptions: {
        'sub-1': { clientState: 'secret', cacheKey: 'onedrive:c1:i1' },
      },
    });

    await service.handleNotifications([
      { subscriptionId: 'sub-1', clientState: 'WRONG' },
    ]);

    expect(refreshCacheKey).not.toHaveBeenCalled();
  });

  it('drops a notification for an unknown subscription', async () => {
    const { service, refreshCacheKey } = buildService({ subscriptions: {} });
    await service.handleNotifications([
      { subscriptionId: 'ghost', clientState: 'x' },
    ]);
    expect(refreshCacheKey).not.toHaveBeenCalled();
  });

  it('de-dupes a burst of notifications to one refresh per cache key', async () => {
    const { service, refreshCacheKey } = buildService({
      subscriptions: {
        'sub-1': { clientState: 's', cacheKey: 'onedrive:c1:i1' },
      },
    });

    await service.handleNotifications([
      { subscriptionId: 'sub-1', clientState: 's' },
      { subscriptionId: 'sub-1', clientState: 's' },
      { subscriptionId: 'sub-1', clientState: 's' },
    ]);

    expect(refreshCacheKey).toHaveBeenCalledTimes(1);
  });
});

describe('GraphWebhookService.isEnabled', () => {
  it('is disabled without a public API url', () => {
    const { service } = buildService({});
    expect(service.isEnabled()).toBe(false);
  });

  it('is enabled with a public API url', () => {
    const { service } = buildService({ publicApiUrl: 'https://api.example' });
    expect(service.isEnabled()).toBe(true);
  });

  it('is enabled with only a webhook tunnel url (local dev)', () => {
    const { service } = buildService({
      webhookPublicUrl: 'https://tunnel.example',
    });
    expect(service.isEnabled()).toBe(true);
  });

  it('ensureSubscription is a no-op when webhooks are disabled', async () => {
    const { service } = buildService({});
    await expect(
      service.ensureSubscription({
        connectionId: 'c1',
        organizationId: 'o1',
        driveId: 'drive1',
        cacheKey: 'onedrive:c1:i1',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('GraphWebhookService.ensureSubscription', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockGraphCreate(body: unknown, ok = true): jest.Mock {
    const fn = jest.fn().mockResolvedValue({
      ok,
      status: ok ? 201 : 400,
      json: () => Promise.resolve(body),
    });
    global.fetch = fn as never;
    return fn;
  }

  it('subscribes on the drive ROOT (item-level subscriptions are rejected by Graph)', async () => {
    const { service, subscriptionsRepository } = buildService({
      publicApiUrl: 'https://api.example',
    });
    const fetchMock = mockGraphCreate({ id: 'sub-9' });

    await service.ensureSubscription({
      connectionId: 'c1',
      organizationId: 'o1',
      driveId: 'drive1',
      cacheKey: 'powerpoint:c1:drive1|item1',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as {
      resource: string;
      notificationUrl: string;
    };
    expect(body.resource).toBe('/drives/drive1/root');
    expect(body.notificationUrl).toBe(
      'https://api.example/api/v1/connections/webhooks/graph',
    );
    expect(subscriptionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub-9',
        resource: '/drives/drive1/root',
        cacheKey: 'powerpoint:c1:drive1|item1',
      }),
    );
  });

  it('falls back to the default drive root without a driveId', async () => {
    const { service } = buildService({ publicApiUrl: 'https://api.example' });
    const fetchMock = mockGraphCreate({ id: 'sub-9' });

    await service.ensureSubscription({
      connectionId: 'c1',
      organizationId: 'o1',
      cacheKey: 'powerpoint:c1:item1',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect((JSON.parse(init.body) as { resource: string }).resource).toBe(
      '/me/drive/root',
    );
  });

  it('subscribes to an explicit resource + changeType verbatim (Outlook Calendar)', async () => {
    const { service, subscriptionsRepository } = buildService({
      publicApiUrl: 'https://api.example',
    });
    const fetchMock = mockGraphCreate({ id: 'sub-cal' });

    await service.ensureSubscription({
      connectionId: 'c1',
      organizationId: 'o1',
      resource: '/me/calendars/AAMk%3D/events',
      changeType: 'created,updated,deleted',
      cacheKey: 'outlook:c1:AAMk=',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as {
      resource: string;
      changeType: string;
    };
    expect(body.resource).toBe('/me/calendars/AAMk%3D/events');
    expect(body.changeType).toBe('created,updated,deleted');
    expect(subscriptionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub-cal',
        resource: '/me/calendars/AAMk%3D/events',
        cacheKey: 'outlook:c1:AAMk=',
      }),
    );
  });

  it('sends notifications through the tunnel url when one is set', async () => {
    const { service } = buildService({
      publicApiUrl: 'https://api.example',
      webhookPublicUrl: 'https://tunnel.example',
    });
    const fetchMock = mockGraphCreate({ id: 'sub-9' });

    await service.ensureSubscription({
      connectionId: 'c1',
      organizationId: 'o1',
      driveId: 'drive1',
      cacheKey: 'k',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(
      (JSON.parse(init.body) as { notificationUrl: string }).notificationUrl,
    ).toBe('https://tunnel.example/api/v1/connections/webhooks/graph');
  });

  it('does not store a row when Graph rejects the subscription', async () => {
    const { service, subscriptionsRepository } = buildService({
      publicApiUrl: 'https://api.example',
    });
    mockGraphCreate({}, false);

    await service.ensureSubscription({
      connectionId: 'c1',
      organizationId: 'o1',
      driveId: 'drive1',
      cacheKey: 'k',
    });

    expect(subscriptionsRepository.create).not.toHaveBeenCalled();
  });
});

/**
 * Subscriptions were created per cache key and never deleted by anything, so an
 * instance delete or any edit that changes the cache key abandoned one — and the
 * hourly cron then renewed it forever. These pin the lifecycle down, including
 * the case the sweep must NOT collect: a key shared by another live instance.
 */
describe('GraphWebhookService.pruneOrphaned', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockGraphDelete(): jest.Mock {
    const fn = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fn as never;
    return fn;
  }

  it('deletes a subscription whose cache key no longer exists', async () => {
    const { service, subscriptionsRepository } = buildService({
      stored: [{ subscriptionId: 'sub-dead', cacheKey: 'menu:excel:gone' }],
      liveCacheKeys: [],
    });
    const fetchMock = mockGraphDelete();

    await expect(service.pruneOrphaned()).resolves.toBe(1);

    // Told Graph to stop sending, then forgot the row.
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string }];
    expect(url).toContain('sub-dead');
    expect(init.method).toBe('DELETE');
    expect(subscriptionsRepository.deleteBySubscriptionId).toHaveBeenCalledWith(
      'sub-dead',
    );
  });

  it('keeps a subscription whose cache key is still live', async () => {
    const { service, subscriptionsRepository } = buildService({
      stored: [{ subscriptionId: 'sub-live', cacheKey: 'menu:excel:live' }],
      liveCacheKeys: ['menu:excel:live'],
    });
    mockGraphDelete();

    await expect(service.pruneOrphaned()).resolves.toBe(0);
    expect(
      subscriptionsRepository.deleteBySubscriptionId,
    ).not.toHaveBeenCalled();
  });

  it('keeps a shared key alive when only one of its instances went away', async () => {
    // Two instances resolved to one cache key, so one subscription served both.
    // Deleting either instance must not stop the other's push.
    const { service, subscriptionsRepository } = buildService({
      stored: [{ subscriptionId: 'sub-shared', cacheKey: 'menu:excel:shared' }],
      liveCacheKeys: ['menu:excel:shared'],
    });
    mockGraphDelete();

    await service.pruneOrphaned();
    expect(
      subscriptionsRepository.deleteBySubscriptionId,
    ).not.toHaveBeenCalled();
  });

  it('still forgets the row when Graph cannot be told (account disconnected)', async () => {
    const { service, subscriptionsRepository } = buildService({
      stored: [
        {
          subscriptionId: 'sub-orphan',
          cacheKey: 'gone',
          connectionId: 'dead',
        },
      ],
      liveCacheKeys: [],
    });
    global.fetch = jest.fn().mockRejectedValue(new Error('401')) as never;

    await expect(service.pruneOrphaned()).resolves.toBe(1);
    expect(subscriptionsRepository.deleteBySubscriptionId).toHaveBeenCalledWith(
      'sub-orphan',
    );
  });

  it('does nothing when the table is empty (no live-key query needed)', async () => {
    const { service, subscriptionsRepository } = buildService({ stored: [] });
    await expect(service.pruneOrphaned()).resolves.toBe(0);
    expect(
      subscriptionsRepository.deleteBySubscriptionId,
    ).not.toHaveBeenCalled();
  });
});

describe('GraphWebhookService.renewExpiring', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('drops a subscription whose connection is gone instead of retrying forever', async () => {
    // The instance (and its cache key) survives a disconnect, so the orphan
    // sweep will never claim this row — but it can never be renewed again.
    const { service, subscriptionsRepository, connectionsService } =
      buildService({
        publicApiUrl: 'https://api.example',
        missingConnections: ['dead'],
      });
    subscriptionsRepository.findExpiringBefore.mockResolvedValue([
      { subscriptionId: 'sub-x', cacheKey: 'k', connectionId: 'dead' },
    ]);
    connectionsService.resolveConnection.mockRejectedValue(
      new Error('Connection not found.'),
    );

    await expect(service.renewExpiring()).resolves.toBe(0);
    expect(subscriptionsRepository.deleteBySubscriptionId).toHaveBeenCalledWith(
      'sub-x',
    );
  });

  it('keeps a subscription whose connection merely failed to resolve this time', async () => {
    const { service, subscriptionsRepository, connectionsService } =
      buildService({ publicApiUrl: 'https://api.example' });
    subscriptionsRepository.findExpiringBefore.mockResolvedValue([
      { subscriptionId: 'sub-y', cacheKey: 'k', connectionId: 'c1' },
    ]);
    connectionsService.resolveConnection.mockRejectedValue(
      new Error('token endpoint 503'),
    );

    await service.renewExpiring();
    expect(
      subscriptionsRepository.deleteBySubscriptionId,
    ).not.toHaveBeenCalled();
  });
});
