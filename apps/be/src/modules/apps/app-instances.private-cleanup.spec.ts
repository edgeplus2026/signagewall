import { powerbiSecureManifest } from '@signagewall/apps';
import { Types } from 'mongoose';

import { AppInstancesService } from './app-instances.service';
import { AppsService } from './apps.service';
import {
  clearPowerBiPrivateStorage,
  registerPowerBiPrivateStorage,
} from './connectors/powerbi-secure/storage.registry';

const NOW = new Date('2026-08-05T12:00:00.000Z');

function powerBiInstance(
  overrides: Partial<ReturnType<typeof basePowerBiInstance>> = {},
) {
  return { ...basePowerBiInstance(), ...overrides };
}

function basePowerBiInstance() {
  const organizationId = new Types.ObjectId();
  const instanceId = new Types.ObjectId();
  const connectionId = new Types.ObjectId().toString();
  return {
    _id: instanceId,
    organizationId,
    appId: new Types.ObjectId(),
    appSlug: 'powerbi-secure',
    name: 'Dispatch board',
    config: {
      connectionId,
      workspace: { id: new Types.ObjectId().toString(), label: 'Operations' },
      report: { id: new Types.ObjectId().toString(), label: 'Dispatch' },
      refreshMinutes: 15,
      slideDuration: 12,
      fit: 'contain',
      background: '#000000',
    },
    configVersion: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function buildService(
  options: {
    instance?: ReturnType<typeof powerBiInstance>;
    instances?: ReturnType<typeof powerBiInstance>[];
  } = {},
) {
  const instance = options.instance ?? powerBiInstance();
  const cleanupInstances = options.instances ?? [instance];
  const refFor = (target: ReturnType<typeof powerBiInstance>) => ({
    kind: 'private-asset' as const,
    key: [
      'private-assets/v1/organizations',
      target.organizationId.toString(),
      'instances',
      target._id.toString(),
      'connections',
      target.config.connectionId,
      'versions/v1/page.png',
    ].join('/'),
    version: 'v1',
    mimeType: 'image/png',
  });
  const ref = refFor(instance);
  const instancesRepository = {
    findById: jest.fn().mockResolvedValue(instance),
    findByApp: jest.fn().mockResolvedValue(cleanupInstances),
    updateById: jest.fn(
      (
        _organizationId: string,
        _instanceId: string,
        update: { config?: Record<string, unknown> },
      ) => Promise.resolve({ ...instance, ...update }),
    ),
    deleteById: jest.fn().mockResolvedValue(true),
    deleteByApp: jest.fn().mockResolvedValue(1),
  };
  const appsRepository = {
    findById: jest.fn().mockResolvedValue({
      version: powerbiSecureManifest.version,
      configSchema: powerbiSecureManifest.configSchema,
    }),
  };
  const connectionsService = {
    assertOwnedByInstance: jest.fn().mockResolvedValue(undefined),
    getOwnedIdentity: jest
      .fn()
      .mockImplementation(
        (organizationId: string, instanceId: string, connectionId: string) =>
          Promise.resolve({
            id: connectionId,
            organizationId,
            appInstanceId: instanceId,
          }),
      ),
    deleteByInstance: jest.fn().mockResolvedValue(undefined),
    deleteByInstances: jest.fn().mockResolvedValue(undefined),
  };
  const appDataCacheRepository = {
    findByCacheKeys: jest.fn((keys: string[]) =>
      Promise.resolve(
        keys.flatMap((key) => {
          const owner = cleanupInstances.find((candidate) =>
            key.includes(candidate.config.connectionId),
          );
          return owner
            ? [
                {
                  slug: 'powerbi-secure',
                  secrets: {
                    powerBiSecure: {
                      rendered: {
                        version: 'v1',
                        reportName: 'Dispatch',
                        exportedAt: NOW.toISOString(),
                        pages: [refFor(owner)],
                      },
                    },
                  },
                },
              ]
            : [];
        }),
      ),
    ),
    deleteByCacheKey: jest.fn().mockResolvedValue(undefined),
  };
  const storage = {
    isConfigured: jest.fn().mockReturnValue(true),
    uploadAsset: jest.fn(),
    deleteReplacedAssets: jest.fn(),
    deleteAssetSet: jest.fn().mockResolvedValue(undefined),
  };
  registerPowerBiPrivateStorage(storage);

  const graphWebhookService = {
    ensureSubscription: jest.fn().mockResolvedValue(undefined),
  };
  const transactionService = {
    run: jest.fn(async (callback: (session: undefined) => Promise<void>) =>
      callback(undefined),
    ),
  };
  const playlistsRepository = {
    removeAppInstances: jest.fn().mockResolvedValue([]),
  };
  const screensService = {
    purgeAppInstanceReferences: jest.fn().mockResolvedValue([]),
  };
  const eventEmitter = { emit: jest.fn() };

  const service = new AppInstancesService(
    instancesRepository as never,
    appsRepository as never,
    graphWebhookService as never,
    connectionsService as never,
    transactionService as never,
    playlistsRepository as never,
    screensService as never,
    eventEmitter as never,
    appDataCacheRepository as never,
    { isInstalled: jest.fn().mockResolvedValue(true) } as never, // orgAppsRepository
  );
  return {
    service,
    instance,
    ref,
    storage,
    connectionsService,
    instancesRepository,
    appsRepository,
    transactionService,
    appDataCacheRepository,
  };
}

afterEach(() => {
  clearPowerBiPrivateStorage();
});

describe('AppInstancesService Power BI private cleanup', () => {
  it('deletes exact owned assets and cache before disconnecting the owner', async () => {
    const built = buildService();

    await built.service.disconnect(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
    );

    expect(built.connectionsService.getOwnedIdentity).toHaveBeenCalledWith(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
      built.instance.config.connectionId,
    );
    expect(built.storage.deleteAssetSet).toHaveBeenCalledWith(
      {
        organizationId: built.instance.organizationId.toString(),
        appInstanceId: built.instance._id.toString(),
        connectionId: built.instance.config.connectionId,
      },
      [built.ref],
    );
    expect(
      built.storage.deleteAssetSet.mock.invocationCallOrder[0],
    ).toBeLessThan(
      built.appDataCacheRepository.deleteByCacheKey.mock.invocationCallOrder[0],
    );
    expect(
      built.appDataCacheRepository.deleteByCacheKey.mock.invocationCallOrder[0],
    ).toBeLessThan(
      built.connectionsService.deleteByInstance.mock.invocationCallOrder[0],
    );
  });

  it('cleans the old cache before saving a changed report selection', async () => {
    const built = buildService();
    const nextConfig = {
      ...built.instance.config,
      report: { id: new Types.ObjectId().toString(), label: 'Production' },
    };

    await built.service.updateConfig(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
      nextConfig,
    );

    expect(built.storage.deleteAssetSet).toHaveBeenCalledTimes(1);
    expect(
      built.appDataCacheRepository.deleteByCacheKey.mock.invocationCallOrder[0],
    ).toBeLessThan(
      built.instancesRepository.updateById.mock.invocationCallOrder[0],
    );
  });

  it('cleans the old cache before saving a changed page selection', async () => {
    const built = buildService();

    await built.service.updateConfig(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
      {
        ...built.instance.config,
        page: { id: 'ReportSection2', label: 'Quality' },
      },
    );

    expect(built.storage.deleteAssetSet).toHaveBeenCalledTimes(1);
    expect(built.appDataCacheRepository.deleteByCacheKey).toHaveBeenCalledTimes(
      1,
    );
  });

  it('keeps snapshots for a presentation-only config change', async () => {
    const built = buildService();

    await built.service.updateConfig(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
      { ...built.instance.config, slideDuration: 30 },
    );

    expect(built.appDataCacheRepository.findByCacheKeys).not.toHaveBeenCalled();
    expect(built.storage.deleteAssetSet).not.toHaveBeenCalled();
    expect(built.instancesRepository.updateById).toHaveBeenCalledTimes(1);
  });

  it('cleans the old selection when bindConnection replaces its id', async () => {
    const built = buildService();
    const nextConnectionId = new Types.ObjectId().toString();

    await built.service.bindConnection(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
      nextConnectionId,
    );

    expect(built.connectionsService.assertOwnedByInstance).toHaveBeenCalledWith(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
      nextConnectionId,
    );
    expect(built.connectionsService.getOwnedIdentity).toHaveBeenCalledWith(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
      built.instance.config.connectionId,
    );
    expect(built.storage.deleteAssetSet).toHaveBeenCalledTimes(1);
  });

  it('cleans private state before deleting one instance', async () => {
    const built = buildService();

    await built.service.remove(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
    );

    expect(built.storage.deleteAssetSet).toHaveBeenCalledTimes(1);
    expect(
      built.appDataCacheRepository.deleteByCacheKey.mock.invocationCallOrder[0],
    ).toBeLessThan(built.transactionService.run.mock.invocationCallOrder[0]);
    expect(built.connectionsService.deleteByInstance).toHaveBeenCalledTimes(1);
  });

  it('cleans every Power BI state before bulk instance removal', async () => {
    const first = powerBiInstance();
    const second = powerBiInstance({
      organizationId: first.organizationId,
      appId: first.appId,
    });
    const built = buildService({ instance: first, instances: [first, second] });
    built.connectionsService.getOwnedIdentity.mockImplementation(
      (organizationId: string, instanceId: string, connectionId: string) =>
        Promise.resolve({
          id: connectionId,
          organizationId,
          appInstanceId: instanceId,
        }),
    );

    await built.service.removeAllForApp(
      first.organizationId.toString(),
      first.appId.toString(),
    );

    expect(built.storage.deleteAssetSet).toHaveBeenCalledTimes(2);
    expect(built.appDataCacheRepository.deleteByCacheKey).toHaveBeenCalledTimes(
      2,
    );
    expect(built.connectionsService.deleteByInstances).toHaveBeenCalledWith(
      first.organizationId.toString(),
      [first._id.toString(), second._id.toString()],
    );
  });

  it('fails closed and keeps owner/cache/config when private storage fails', async () => {
    const built = buildService();
    built.storage.deleteAssetSet.mockRejectedValueOnce(
      new Error('private bucket unavailable'),
    );

    await expect(
      built.service.disconnect(
        built.instance.organizationId.toString(),
        built.instance._id.toString(),
      ),
    ).rejects.toThrow('private bucket unavailable');

    expect(
      built.appDataCacheRepository.deleteByCacheKey,
    ).not.toHaveBeenCalled();
    expect(built.connectionsService.deleteByInstance).not.toHaveBeenCalled();
    expect(built.instancesRepository.updateById).not.toHaveBeenCalled();
  });

  it('aborts bulk removal before its transaction when private storage fails', async () => {
    const built = buildService();
    built.storage.deleteAssetSet.mockRejectedValueOnce(
      new Error('private bucket unavailable'),
    );

    await expect(
      built.service.removeAllForApp(
        built.instance.organizationId.toString(),
        built.instance.appId.toString(),
      ),
    ).rejects.toThrow('private bucket unavailable');

    expect(built.transactionService.run).not.toHaveBeenCalled();
    expect(built.connectionsService.deleteByInstances).not.toHaveBeenCalled();
    expect(
      built.appDataCacheRepository.deleteByCacheKey,
    ).not.toHaveBeenCalled();
  });

  it('rejects a foreign persisted owner before touching storage or cache', async () => {
    const built = buildService();
    built.connectionsService.getOwnedIdentity.mockRejectedValueOnce(
      new Error('Connection not found.'),
    );

    await expect(
      built.service.disconnect(
        built.instance.organizationId.toString(),
        built.instance._id.toString(),
      ),
    ).rejects.toThrow(/not found/i);

    expect(built.storage.deleteAssetSet).not.toHaveBeenCalled();
    expect(
      built.appDataCacheRepository.deleteByCacheKey,
    ).not.toHaveBeenCalled();
    expect(built.connectionsService.deleteByInstance).not.toHaveBeenCalled();
  });

  it('does not delete a colliding cache entry from another connector', async () => {
    const built = buildService();
    built.appDataCacheRepository.findByCacheKeys.mockResolvedValueOnce([
      { slug: 'weather', secrets: {} },
    ]);

    await expect(
      built.service.disconnect(
        built.instance.organizationId.toString(),
        built.instance._id.toString(),
      ),
    ).rejects.toThrow(/verify its cache entry/i);

    expect(built.connectionsService.getOwnedIdentity).not.toHaveBeenCalled();
    expect(built.storage.deleteAssetSet).not.toHaveBeenCalled();
    expect(
      built.appDataCacheRepository.deleteByCacheKey,
    ).not.toHaveBeenCalled();
  });

  it('does not inspect private state for another connector', async () => {
    const built = buildService();
    built.instancesRepository.findById.mockResolvedValueOnce({
      ...built.instance,
      appSlug: 'weather',
      config: { location: 'belgrade' },
    });

    await built.service.disconnect(
      built.instance.organizationId.toString(),
      built.instance._id.toString(),
    );

    expect(built.appDataCacheRepository.findByCacheKeys).not.toHaveBeenCalled();
    expect(built.connectionsService.getOwnedIdentity).not.toHaveBeenCalled();
    expect(built.storage.deleteAssetSet).not.toHaveBeenCalled();
    expect(built.connectionsService.deleteByInstance).toHaveBeenCalledTimes(1);
  });
});

describe('AppsService uninstall ordering', () => {
  it('keeps the installation when private instance cleanup fails', async () => {
    const cleanupError = new Error('private cleanup failed');
    const orgAppsRepository = { uninstall: jest.fn() };
    const instancesService = {
      removeAllForApp: jest.fn().mockRejectedValue(cleanupError),
    };
    const service = new AppsService(
      {} as never,
      orgAppsRepository as never,
      instancesService as never,
      {} as never, // organizationsRepository
    );

    await expect(service.uninstall('org-1', 'app-1')).rejects.toBe(
      cleanupError,
    );
    expect(orgAppsRepository.uninstall).not.toHaveBeenCalled();
  });

  it('removes the installation only after all instances are removed', async () => {
    const orgAppsRepository = {
      uninstall: jest.fn().mockResolvedValue(undefined),
    };
    const instancesService = {
      removeAllForApp: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AppsService(
      {} as never,
      orgAppsRepository as never,
      instancesService as never,
      {} as never, // organizationsRepository
    );

    await service.uninstall('org-1', 'app-1');

    expect(
      instancesService.removeAllForApp.mock.invocationCallOrder[0],
    ).toBeLessThan(orgAppsRepository.uninstall.mock.invocationCallOrder[0]);
  });
});
