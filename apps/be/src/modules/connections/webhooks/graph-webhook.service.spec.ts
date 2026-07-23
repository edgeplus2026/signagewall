import { GraphWebhookService } from './graph-webhook.service';

function buildService(options: {
  subscriptions?: Record<
    string,
    { clientState: string; cacheKey: string } | undefined
  >;
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
    updateExpiry: jest.fn(),
    create: jest.fn(),
    deleteBySubscriptionId: jest.fn(),
  };
  const connectionsService = {
    resolveConnection: jest
      .fn()
      .mockResolvedValue({ id: 'c1', accessToken: 'tok' }),
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
  const appDataService = { refreshCacheKey };

  const service = new GraphWebhookService(
    subscriptionsRepository as never,
    connectionsService as never,
    configService as never,
    appDataService as never,
  );
  return { service, refreshCacheKey, subscriptionsRepository };
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
