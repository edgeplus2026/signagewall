import { HttpStatus } from '@nestjs/common';

import {
  isHydratedPrivateAssetRef,
  isPrivateAssetRef,
  type PrivateAssetRef,
} from '@signagewall/apps-contract';
import {
  PrivateAssetsHydrationService,
  hydratePrivateAssetRefs,
} from './private-assets-hydration.service';

const ref: PrivateAssetRef = {
  kind: 'private-asset',
  key: 'private-assets/v1/organizations/org-a/instances/instance-a/connections/connection-a/versions/revision-1/page.png',
  version: 'revision-1',
  mimeType: 'image/png',
};

function temporaryUrl(value: PrivateAssetRef, renewal: number): string {
  const url = new URL(`/${value.key}`, 'https://private.invalid');
  url.searchParams.set('renewal', String(renewal));
  return url.href;
}

function buildService(
  options: {
    owned?: boolean;
    assigned?: boolean;
    playlistAssigned?: boolean;
    signingFailure?: boolean;
  } = {},
) {
  const instance = {
    _id: { toString: () => 'instance-a' },
    config: { connectionId: 'connection-a' },
  };
  const appInstancesRepository = {
    findById: jest.fn(async (organizationId: string) =>
      options.owned === false || organizationId !== 'org-a' ? null : instance,
    ),
  };
  const screensRepository = {
    findById: jest.fn(async (organizationId: string) =>
      organizationId !== 'org-a'
        ? null
        : {
            items: options.playlistAssigned
              ? [
                  {
                    type: 'playlist',
                    disabled: false,
                    playlistId: { toString: () => 'playlist-a' },
                  },
                ]
              : [
                  {
                    type: 'app',
                    disabled: options.assigned === false,
                    appInstanceId: { toString: () => 'instance-a' },
                  },
                ],
          },
    ),
  };
  const playlistsRepository = {
    findById: jest.fn(async () => ({
      items: [
        {
          type: 'app',
          disabled: !options.playlistAssigned,
          appInstanceId: { toString: () => 'instance-a' },
        },
      ],
    })),
  };
  const signGetUrl = jest.fn((_owner, value: PrivateAssetRef) => {
    if (options.signingFailure) {
      throw new Error('signer unavailable');
    }
    return temporaryUrl(value, 1);
  });
  const service = new PrivateAssetsHydrationService(
    appInstancesRepository as never,
    screensRepository as never,
    playlistsRepository as never,
    { signGetUrl } as never,
  );
  return { service, signGetUrl, appInstancesRepository, playlistsRepository };
}

describe('private asset contract and hydration', () => {
  it('guards credential-free and hydrated refs', () => {
    expect(isPrivateAssetRef(ref)).toBe(true);
    expect(isHydratedPrivateAssetRef(ref)).toBe(false);
    expect(
      isHydratedPrivateAssetRef({ ...ref, url: temporaryUrl(ref, 1) }),
    ).toBe(true);
    expect(isPrivateAssetRef({ ...ref, version: '' })).toBe(false);
  });

  it('recursively hydrates every page, deduplicates refs and does not mutate cache data', async () => {
    const signer = jest.fn(async (value: PrivateAssetRef) => ({
      ...value,
      url: temporaryUrl(value, 1),
    }));
    const payload = { pages: [ref, { nested: ref }] };

    const hydrated = await hydratePrivateAssetRefs(payload, signer);

    expect(signer).toHaveBeenCalledTimes(1);
    expect(hydrated.pages[0]).toHaveProperty('url');
    expect(
      (hydrated.pages[1] as { nested: PrivateAssetRef }).nested,
    ).toHaveProperty('url');
    expect(payload.pages[0]).not.toHaveProperty('url');
  });

  it('hydrates only after player assignment and passes tenant ownership to storage', async () => {
    const { service, signGetUrl } = buildService();

    const hydrated = await service.hydrateForPlayer({
      organizationId: 'org-a',
      screenId: 'screen-a',
      appInstanceId: 'instance-a',
      payload: { pages: [ref] },
    });

    expect(hydrated.pages[0]).toHaveProperty('url');
    expect(signGetUrl).toHaveBeenCalledWith(
      {
        organizationId: 'org-a',
        appInstanceId: 'instance-a',
        connectionId: 'connection-a',
      },
      ref,
    );
  });

  it('accepts active playlist assignment', async () => {
    const { service, playlistsRepository } = buildService({
      assigned: false,
      playlistAssigned: true,
    });

    await expect(
      service.hydrateForPlayer({
        organizationId: 'org-a',
        screenId: 'screen-a',
        appInstanceId: 'instance-a',
        payload: { pages: [ref] },
      }),
    ).resolves.toHaveProperty('pages.0.url');
    expect(playlistsRepository.findById).toHaveBeenCalledWith(
      'org-a',
      'playlist-a',
    );
  });

  it.each<[string, { organizationId: string; assigned?: boolean }]>([
    ['cross-organization request', { organizationId: 'org-b' }],
    ['unassigned instance', { organizationId: 'org-a', assigned: false }],
  ])('denies %s before signing', async (_label, scenario) => {
    const { service, signGetUrl } = buildService({
      assigned: scenario.assigned,
    });

    const attempt = service.hydrateForPlayer({
      organizationId: scenario.organizationId,
      screenId: 'screen-a',
      appInstanceId: 'instance-a',
      payload: { pages: [ref] },
    });

    await expect(attempt).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
    expect(signGetUrl).not.toHaveBeenCalled();
  });
});
