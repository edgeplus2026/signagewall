import { Types } from 'mongoose';

import { ConnectionsService } from './connections.service';
import { ConnectionProvider } from './schemas/app-connection.schema';

/**
 * Reversible "encryption" stand-in: prefixes the plaintext so the spec can
 * assert what was stored is not the raw token, while staying decryptable.
 */
const encryption = {
  isEnabled: () => true,
  encrypt: (value: string) => `enc(${value})`,
  decrypt: (value: string) => value.replace(/^enc\((.*)\)$/, '$1'),
};

function buildService(options: {
  doc?: Record<string, unknown> | null;
  instance?: Record<string, unknown> | null;
  config?: Record<string, string | undefined>;
  refreshResult?: {
    accessToken: string;
    refreshToken?: string;
    expiresInSeconds?: number;
    scopes: string[];
  };
}) {
  const updateTokens = jest.fn().mockResolvedValue(undefined);
  const repository = {
    findByIdUnscoped: jest.fn().mockResolvedValue(options.doc ?? null),
    findById: jest.fn().mockResolvedValue(options.doc ?? null),
    upsertByInstance: jest.fn(),
    updateTokens,
  };
  const configService = {
    get: (key: string) =>
      Object.prototype.hasOwnProperty.call(options.config ?? {}, key)
        ? options.config?.[key]
        : key === 'google.clientId'
          ? 'cid'
          : key === 'google.clientSecret'
            ? 'secret'
            : undefined,
    getOrThrow: () => 'jwt-secret',
  };
  const jwtService = { sign: jest.fn(), verify: jest.fn() };
  const appInstancesRepository = {
    findById: jest
      .fn()
      .mockResolvedValue(
        options.instance === undefined ? { appSlug: 'gcal' } : options.instance,
      ),
  };

  const service = new ConnectionsService(
    repository as never,
    encryption as never,
    configService as never,
    jwtService as never,
    appInstancesRepository as never,
  );

  // Patch the provider refresh used by resolveConnection.
  if (options.refreshResult) {
    jest
      .spyOn(
        service as unknown as {
          getProvider: (p: ConnectionProvider) => unknown;
        },
        'getProvider',
      )
      .mockReturnValue({
        refresh: jest.fn().mockResolvedValue(options.refreshResult),
      });
  }

  return {
    service,
    repository,
    updateTokens,
    jwtService,
    appInstancesRepository,
  };
}

describe('ConnectionsService Meta configuration selection', () => {
  it('falls back to the shared configuration when connector overrides are blank', () => {
    const { service } = buildService({
      config: {
        'meta.configurationId': 'shared-config',
        'meta.facebookConfigurationId': '',
        'meta.instagramConfigurationId': '   ',
      },
    });
    const select = service as unknown as {
      metaConfigurationId: (appSlug: string) => string | undefined;
    };

    expect(select.metaConfigurationId('facebook')).toBe('shared-config');
    expect(select.metaConfigurationId('instagram')).toBe('shared-config');
  });

  it('prefers a non-blank connector configuration', () => {
    const { service } = buildService({
      config: {
        'meta.configurationId': 'shared-config',
        'meta.facebookConfigurationId': ' facebook-config ',
      },
    });
    const select = service as unknown as {
      metaConfigurationId: (appSlug: string) => string | undefined;
    };

    expect(select.metaConfigurationId('facebook')).toBe('facebook-config');
  });
});

describe('ConnectionsService OAuth instance ownership', () => {
  const organizationId = new Types.ObjectId().toString();
  const instanceId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  it('rejects a foreign OAuth start before minting signed state', async () => {
    const { service, jwtService, appInstancesRepository } = buildService({
      instance: null,
    });

    await expect(
      service.buildAuthorizationUrl({
        organizationId,
        userId,
        provider: ConnectionProvider.GOOGLE,
        appSlug: 'gcal',
        instanceId,
      }),
    ).rejects.toThrow(/instance not found/i);

    expect(appInstancesRepository.findById).toHaveBeenCalledWith(
      organizationId,
      instanceId,
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects a foreign/deleted callback before token exchange or upsert', async () => {
    const { service, repository, jwtService } = buildService({
      instance: null,
    });
    jwtService.verify.mockReturnValue({
      organizationId,
      userId,
      provider: ConnectionProvider.GOOGLE,
      appSlug: 'gcal',
      instanceId,
    });
    const exchangeCode = jest.fn();
    jest
      .spyOn(
        service as unknown as {
          getProvider: (provider: ConnectionProvider) => unknown;
        },
        'getProvider',
      )
      .mockReturnValue({ exchangeCode });

    await expect(
      service.handleCallback(ConnectionProvider.GOOGLE, 'code', 'state'),
    ).rejects.toThrow(/instance not found/i);

    expect(exchangeCode).not.toHaveBeenCalled();
    expect(repository.upsertByInstance).not.toHaveBeenCalled();
  });

  it('rejects an app-slug swap for an otherwise owned instance', async () => {
    const { service, jwtService } = buildService({
      instance: { appSlug: 'outlook' },
    });

    await expect(
      service.buildAuthorizationUrl({
        organizationId,
        userId,
        provider: ConnectionProvider.GOOGLE,
        appSlug: 'gcal',
        instanceId,
      }),
    ).rejects.toThrow(/instance not found/i);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});

function connectionDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    organizationId: new Types.ObjectId(),
    instanceId: new Types.ObjectId(),
    provider: ConnectionProvider.GOOGLE,
    accountLabel: 'user@example.com',
    scopes: ['calendar.readonly'],
    accessTokenEnc: 'enc(access-old)',
    refreshTokenEnc: 'enc(refresh-1)',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ConnectionsService.assertOwnedByInstance (per-instance ownership)', () => {
  it('passes when the connection belongs to the instance', async () => {
    const doc = connectionDoc();
    const { service } = buildService({ doc });

    await expect(
      service.assertOwnedByInstance(
        'org-1',
        doc.instanceId.toString(),
        doc._id.toString(),
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a connection owned by a different instance', async () => {
    const doc = connectionDoc();
    const { service } = buildService({ doc });

    await expect(
      service.assertOwnedByInstance(
        'org-1',
        new Types.ObjectId().toString(), // a different instance
        doc._id.toString(),
      ),
    ).rejects.toThrow(/not found/i);
  });
});

describe('ConnectionsService.getOwnedIdentity', () => {
  it('returns persisted ownership without decrypting or refreshing tokens', async () => {
    const doc = connectionDoc({ expiresAt: new Date(Date.now() - 1_000) });
    const { service, updateTokens } = buildService({ doc });

    await expect(
      service.getOwnedIdentity(
        doc.organizationId.toString(),
        doc.instanceId.toString(),
        doc._id.toString(),
      ),
    ).resolves.toEqual({
      id: doc._id.toString(),
      organizationId: doc.organizationId.toString(),
      appInstanceId: doc.instanceId.toString(),
    });
    expect(updateTokens).not.toHaveBeenCalled();
  });

  it('rejects a foreign instance owner', async () => {
    const doc = connectionDoc();
    const { service } = buildService({ doc });

    await expect(
      service.getOwnedIdentity(
        doc.organizationId.toString(),
        new Types.ObjectId().toString(),
        doc._id.toString(),
      ),
    ).rejects.toThrow(/not found/i);
  });

  it('rejects a foreign organization owner', async () => {
    const doc = connectionDoc();
    const { service, repository } = buildService({ doc });
    repository.findById.mockImplementation((organizationId: string) =>
      Promise.resolve(
        organizationId === doc.organizationId.toString() ? doc : null,
      ),
    );

    await expect(
      service.getOwnedIdentity(
        new Types.ObjectId().toString(),
        doc.instanceId.toString(),
        doc._id.toString(),
      ),
    ).rejects.toThrow(/not found/i);
  });
});

describe('ConnectionsService.resolveConnection', () => {
  it('returns decrypted tokens without refreshing a fresh connection', async () => {
    const doc = connectionDoc();
    const { service, updateTokens } = buildService({ doc });

    const resolved = await service.resolveConnection(doc._id.toString());

    expect(resolved.accessToken).toBe('access-old');
    expect(resolved.refreshToken).toBe('refresh-1');
    expect(resolved.accountLabel).toBe('user@example.com');
    expect(resolved.organizationId).toBe(doc.organizationId.toString());
    expect(resolved.appInstanceId).toBe(doc.instanceId.toString());
    expect(updateTokens).not.toHaveBeenCalled();
  });

  it('refreshes and persists when the access token is expiring', async () => {
    const doc = connectionDoc({ expiresAt: new Date(Date.now() + 1_000) });
    const { service, updateTokens } = buildService({
      doc,
      refreshResult: {
        accessToken: 'access-new',
        refreshToken: 'refresh-2',
        expiresInSeconds: 3600,
        scopes: ['calendar.readonly'],
      },
    });

    const resolved = await service.resolveConnection(doc._id.toString());

    expect(resolved.accessToken).toBe('access-new');
    // New tokens were persisted encrypted.
    expect(updateTokens).toHaveBeenCalledWith(
      doc._id.toString(),
      expect.objectContaining({ accessTokenEnc: 'enc(access-new)' }),
    );
  });

  it('does not refresh when there is no refresh token', async () => {
    const doc = connectionDoc({
      expiresAt: new Date(Date.now() + 1_000),
      refreshTokenEnc: undefined,
    });
    const { service, updateTokens } = buildService({ doc });

    const resolved = await service.resolveConnection(doc._id.toString());
    expect(resolved.accessToken).toBe('access-old');
    expect(updateTokens).not.toHaveBeenCalled();
  });

  it('throws when the connection is missing', async () => {
    const { service } = buildService({ doc: null });
    await expect(
      service.resolveConnection(new Types.ObjectId().toString()),
    ).rejects.toThrow(/not found/i);
  });
});

describe('ConnectionsService Power BI cascading browse', () => {
  const workspaceId = 'f089354e-8366-4e18-aea3-4cb4a3a50b48';

  it('requires a workspace before browsing reports', async () => {
    const doc = connectionDoc({ provider: ConnectionProvider.MICROSOFT });
    const { service } = buildService({ doc });

    await expect(
      service.browseRemoteOptions(
        doc.organizationId.toString(),
        doc._id.toString(),
        'powerbi-reports',
        '',
      ),
    ).rejects.toThrow(/workspace first/i);
  });

  it('passes only the selected parent id to the Power BI provider', async () => {
    const doc = connectionDoc({ provider: ConnectionProvider.MICROSOFT });
    const { service } = buildService({ doc });
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({
        value: [
          {
            id: '879445d6-3a9e-4a74-b5ae-7c0ddabf0f11',
            name: 'Shift report',
          },
        ],
      }),
    });
    global.fetch = fetchMock as never;

    try {
      await expect(
        service.browseRemoteOptions(
          doc.organizationId.toString(),
          doc._id.toString(),
          'powerbi-reports',
          'shift',
          { workspaceId },
        ),
      ).resolves.toEqual([
        {
          id: '879445d6-3a9e-4a74-b5ae-7c0ddabf0f11',
          title: 'Shift report',
        },
      ]);

      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports`,
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
