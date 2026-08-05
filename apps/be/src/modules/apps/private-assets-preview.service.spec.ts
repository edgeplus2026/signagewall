import type { PrivateAssetRef } from '@signagewall/apps-contract';

import { PrivateAssetsPreviewService } from './private-assets-preview.service';

const ref: PrivateAssetRef = {
  kind: 'private-asset',
  key: 'private-assets/v1/organizations/org-1/instances/instance-1/connections/connection-1/versions/v1/page.webp',
  version: 'v1',
  mimeType: 'image/webp',
};

function setup(instance: Record<string, unknown> | null) {
  const repository = { findById: jest.fn().mockResolvedValue(instance) };
  const storage = {
    signGetUrl: jest.fn().mockReturnValue('https://private.test/page?sig=one'),
  };
  return {
    service: new PrivateAssetsPreviewService(
      repository as never,
      storage as never,
    ),
    repository,
    storage,
  };
}

describe('PrivateAssetsPreviewService', () => {
  it('signs duplicate refs once using the persisted connection owner', async () => {
    const { service, storage } = setup({
      config: { connectionId: 'connection-1' },
    });

    const result = await service.hydrate({
      organizationId: 'org-1',
      appInstanceId: 'instance-1',
      payload: { pages: [ref, ref] },
    });

    expect(result.pages).toEqual([
      { ...ref, url: 'https://private.test/page?sig=one' },
      { ...ref, url: 'https://private.test/page?sig=one' },
    ]);
    expect(storage.signGetUrl).toHaveBeenCalledTimes(1);
    expect(storage.signGetUrl).toHaveBeenCalledWith(
      {
        organizationId: 'org-1',
        appInstanceId: 'instance-1',
        connectionId: 'connection-1',
      },
      ref,
    );
  });

  it('denies a missing/cross-org instance before signing', async () => {
    const { service, storage } = setup(null);
    await expect(
      service.hydrate({
        organizationId: 'other-org',
        appInstanceId: 'instance-1',
        payload: { pages: [ref] },
      }),
    ).rejects.toThrow(/access denied/i);
    expect(storage.signGetUrl).not.toHaveBeenCalled();
  });

  it('fails closed when an owned instance has no persisted connection', async () => {
    const { service, storage } = setup({ config: {} });
    await expect(
      service.hydrate({
        organizationId: 'org-1',
        appInstanceId: 'instance-1',
        payload: { pages: [ref] },
      }),
    ).rejects.toThrow(/access denied/i);
    expect(storage.signGetUrl).not.toHaveBeenCalled();
  });

  it('rejects a malformed private marker without exposing it', async () => {
    const { service, storage } = setup({
      config: { connectionId: 'connection-1' },
    });
    await expect(
      service.hydrate({
        organizationId: 'org-1',
        appInstanceId: 'instance-1',
        payload: { page: { kind: 'private-asset', key: 'unsafe' } },
      }),
    ).rejects.toThrow(/malformed/i);
    expect(storage.signGetUrl).not.toHaveBeenCalled();
  });
});
