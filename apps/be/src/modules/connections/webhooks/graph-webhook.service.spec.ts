import { GraphWebhookService } from './graph-webhook.service';

function buildService(options: {
  subscriptions?: Record<
    string,
    { clientState: string; cacheKey: string } | undefined
  >;
  publicApiUrl?: string;
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
  const connectionsService = { resolveConnection: jest.fn() };
  const configService = {
    get: (key: string) =>
      key === 'publicApiUrl' ? options.publicApiUrl : undefined,
    getOrThrow: () => options.publicApiUrl ?? '',
  };
  const appDataService = { refreshCacheKey };

  const service = new GraphWebhookService(
    subscriptionsRepository as never,
    connectionsService as never,
    configService as never,
    appDataService as never,
  );
  return { service, refreshCacheKey };
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

  it('ensureSubscription is a no-op when webhooks are disabled', async () => {
    const { service } = buildService({});
    await expect(
      service.ensureSubscription({
        connectionId: 'c1',
        organizationId: 'o1',
        itemId: 'i1',
        cacheKey: 'onedrive:c1:i1',
      }),
    ).resolves.toBeUndefined();
  });
});
