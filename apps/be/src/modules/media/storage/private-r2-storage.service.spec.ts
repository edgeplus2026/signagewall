import { createHash } from 'crypto';
import { Readable } from 'stream';

import {
  PrivateAssetOwner,
  PrivateR2StorageService,
  presignPrivateR2GetUrl,
  privateAssetUrlExpiresAt,
} from './private-r2-storage.service';

const OWNER: PrivateAssetOwner = {
  organizationId: 'org-a',
  appInstanceId: 'instance-a',
  connectionId: 'connection-a',
};

function config(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn((key: string) => values[key]),
  };
}

function signingMaterial() {
  const seed = createHash('sha256')
    .update(expect.getState().currentTestName ?? 'private-r2-test')
    .digest('hex');
  return {
    accountId: seed.slice(0, 32),
    accessKeyId: seed.slice(0, 20),
    secretAccessKey: createHash('sha256').update(seed).digest('hex'),
    bucket: `private-${seed.slice(0, 8)}`,
  };
}

function configuredService() {
  const service = new PrivateR2StorageService(config() as never);
  const send = jest.fn();
  const credentials = signingMaterial();
  const internals = service as unknown as {
    client: { send: typeof send };
    credentials: typeof credentials;
  };
  internals.client = { send };
  internals.credentials = credentials;
  return { service, send, credentials };
}

describe('PrivateR2StorageService', () => {
  it('does not fall back to public R2 configuration', () => {
    const service = new PrivateR2StorageService(
      config({
        'r2.accountId': 'public-account',
        'r2.bucket': 'public-bucket',
        'r2.publicUrl': 'https://public.invalid',
      }) as never,
    );

    service.onModuleInit();

    expect(service.isConfigured()).toBe(false);
  });

  it('refuses to reuse the bucket configured for public media', () => {
    const material = signingMaterial();
    const service = new PrivateR2StorageService(
      config({
        'privateR2.accountId': material.accountId,
        'privateR2.accessKeyId': material.accessKeyId,
        'privateR2.secretAccessKey': material.secretAccessKey,
        'privateR2.bucket': material.bucket,
        'r2.bucket': material.bucket,
      }) as never,
    );

    service.onModuleInit();

    expect(service.isConfigured()).toBe(false);
  });

  it('scopes immutable object keys to org, instance, connection and version', () => {
    const { service } = configuredService();
    const first = service.buildObjectKey(OWNER, 'revision-1', 'Page 1.png');
    const next = service.buildObjectKey(OWNER, 'revision-2', 'Page 1.png');

    expect(first).toContain(
      '/organizations/org-a/instances/instance-a/connections/connection-a/versions/revision-1/',
    );
    expect(first).not.toBe(next);
    expect(service.ownsKey(OWNER, first)).toBe(true);
    expect(service.ownsKey({ ...OWNER, organizationId: 'org-b' }, first)).toBe(
      false,
    );
  });

  it('uploads, downloads, streams and deletes only owned refs', async () => {
    const { service, send } = configuredService();
    send
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Body: { transformToByteArray: async () => Uint8Array.from([1, 2]) },
        ContentType: 'image/png',
      })
      .mockResolvedValueOnce({
        Body: Readable.from(Buffer.from([3, 4])),
        ContentType: 'image/png',
        ContentLength: 2,
      })
      .mockResolvedValueOnce({});

    const ref = await service.uploadAsset({
      owner: OWNER,
      version: 'revision-1',
      filename: 'page.png',
      body: Buffer.from([1, 2]),
      mimeType: 'image/png',
    });
    const downloaded = await service.downloadAsset(OWNER, ref);
    const streamed = await service.streamAsset(OWNER, ref);
    await service.deleteAsset(OWNER, ref);

    expect(downloaded).toEqual({
      body: Buffer.from([1, 2]),
      contentType: 'image/png',
    });
    expect(streamed).toMatchObject({
      contentType: 'image/png',
      contentLength: 2,
    });
    expect(send).toHaveBeenCalledTimes(4);
    await expect(
      service.deleteAsset({ ...OWNER, organizationId: 'org-b' }, ref),
    ).rejects.toThrow('ownership mismatch');
    expect(send).toHaveBeenCalledTimes(4);
  });

  it('deletes replaced refs but retains refs still in the current set', async () => {
    const { service, send } = configuredService();
    send.mockResolvedValue({});
    const oldRef = {
      kind: 'private-asset' as const,
      key: service.buildObjectKey(OWNER, 'revision-1', 'old.png'),
      version: 'revision-1',
      mimeType: 'image/png',
    };
    const retainedRef = {
      kind: 'private-asset' as const,
      key: service.buildObjectKey(OWNER, 'revision-1', 'retained.png'),
      version: 'revision-1',
      mimeType: 'image/png',
    };

    await service.deleteReplacedAssets(
      OWNER,
      [oldRef, retainedRef],
      [retainedRef],
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].input.Key).toBe(oldRef.key);
  });

  it('issues expiring URLs and renews them without changing the object path', () => {
    const material = signingMaterial();
    const base = {
      ...material,
      key: 'private-assets/v1/organizations/o/instances/i/connections/c/versions/v/page.png',
      expiresInSeconds: 900,
    };
    const first = presignPrivateR2GetUrl({
      ...base,
      now: new Date('2026-08-05T10:00:00.000Z'),
    });
    const renewed = presignPrivateR2GetUrl({
      ...base,
      now: new Date('2026-08-05T10:10:00.000Z'),
    });

    expect(first).not.toBe(renewed);
    expect(new URL(first).pathname).toBe(new URL(renewed).pathname);
    expect(privateAssetUrlExpiresAt(first)?.toISOString()).toBe(
      '2026-08-05T10:15:00.000Z',
    );
    expect(privateAssetUrlExpiresAt(first)!.getTime()).toBeLessThan(
      new Date('2026-08-05T10:16:00.000Z').getTime(),
    );
  });

  it('fails signing when credentials or expiry are invalid', () => {
    const material = signingMaterial();
    expect(() =>
      presignPrivateR2GetUrl({
        ...material,
        secretAccessKey: '',
        key: 'private-assets/v1/organizations/o/instances/i/connections/c/versions/v/page.png',
        expiresInSeconds: 900,
      }),
    ).toThrow('credentials are incomplete');
    expect(() =>
      presignPrivateR2GetUrl({
        ...material,
        key: 'private-assets/v1/organizations/o/instances/i/connections/c/versions/v/page.png',
        expiresInSeconds: 0,
      }),
    ).toThrow('TTL');
  });
});
