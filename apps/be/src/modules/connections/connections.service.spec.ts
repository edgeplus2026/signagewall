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
    updateTokens,
  };
  const configService = {
    get: (key: string) =>
      key === 'microsoft.tenant'
        ? 'common'
        : key === 'google.clientId' || key === 'microsoft.clientId'
          ? 'cid'
          : key === 'google.clientSecret' || key === 'microsoft.clientSecret'
            ? 'secret'
            : undefined,
    getOrThrow: () => 'jwt-secret',
  };
  const jwtService = { sign: jest.fn(), verify: jest.fn() };

  const service = new ConnectionsService(
    repository as never,
    encryption as never,
    configService as never,
    jwtService as never,
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

  return { service, repository, updateTokens };
}

function connectionDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
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

describe('ConnectionsService.resolveConnection', () => {
  it('returns decrypted tokens without refreshing a fresh connection', async () => {
    const doc = connectionDoc();
    const { service, updateTokens } = buildService({ doc });

    const resolved = await service.resolveConnection(doc._id.toString());

    expect(resolved.accessToken).toBe('access-old');
    expect(resolved.refreshToken).toBe('refresh-1');
    expect(resolved.accountLabel).toBe('user@example.com');
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
