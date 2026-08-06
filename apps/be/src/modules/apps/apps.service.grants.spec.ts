import { Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { AppsService } from './apps.service';

/**
 * Beta entitlements (INT-03): a super-admin grants a non-public app to a
 * named organization; that org sees it in its catalog and can instantiate
 * it, everyone else still cannot — and revoking cascades the uninstall.
 */

const APP_ID = new Types.ObjectId();
const ORG_ID = new Types.ObjectId();

interface AppStub {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  isPublic: boolean;
  updatedAt: Date;
  configSchema?: never[];
}

const app = (overrides: Partial<AppStub> = {}): AppStub => ({
  _id: APP_ID,
  slug: 'opsboard',
  name: 'OpsBoard',
  isPublic: false,
  updatedAt: new Date('2026-08-01T00:00:00Z'),
  ...overrides,
});

interface Deps {
  app?: AppStub | null;
  organization?: { _id: Types.ObjectId; name: string } | null;
  installs?: { organizationId: Types.ObjectId; createdAt: Date }[];
  visibleApps?: AppStub[];
  installedAppIds?: string[];
}

function build(deps: Deps = {}) {
  const appsRepository = {
    findById: jest
      .fn()
      .mockResolvedValue(deps.app === undefined ? app() : deps.app),
    findVisible: jest.fn().mockResolvedValue(deps.visibleApps ?? []),
    findManyByIds: jest.fn((ids: string[]) =>
      Promise.resolve(
        ids.includes(APP_ID.toString()) && (deps.app === undefined || deps.app)
          ? [deps.app ?? app()]
          : [],
      ),
    ),
  };
  const orgAppsRepository = {
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    findInstallsForApp: jest.fn().mockResolvedValue(
      deps.installs ?? [
        {
          organizationId: ORG_ID,
          createdAt: new Date('2026-08-06T09:00:00Z'),
        },
      ],
    ),
    findInstalledAppIds: jest
      .fn()
      .mockResolvedValue(deps.installedAppIds ?? []),
  };
  const instancesService = {
    removeAllForApp: jest.fn().mockResolvedValue(undefined),
  };
  const organizationsRepository = {
    findById: jest
      .fn()
      .mockResolvedValue(
        deps.organization === undefined
          ? { _id: ORG_ID, name: 'Demo Org' }
          : deps.organization,
      ),
    findManyByIds: jest
      .fn()
      .mockResolvedValue(
        deps.organization === undefined
          ? [{ _id: ORG_ID, name: 'Demo Org' }]
          : deps.organization
            ? [deps.organization]
            : [],
      ),
  };

  const service = new AppsService(
    appsRepository as never,
    orgAppsRepository as never,
    instancesService as never,
    organizationsRepository as never,
  );

  return {
    service,
    appsRepository,
    orgAppsRepository,
    instancesService,
    organizationsRepository,
  };
}

describe('AppsService grants', () => {
  it('grants a non-public app to a named organization', async () => {
    const { service, orgAppsRepository } = build();

    const grants = await service.grantToOrganization(
      APP_ID.toString(),
      ORG_ID.toString(),
      'admin-user',
    );

    expect(orgAppsRepository.install).toHaveBeenCalledWith(
      ORG_ID.toString(),
      APP_ID.toString(),
      'admin-user',
    );
    expect(grants).toEqual([
      {
        organizationId: ORG_ID.toString(),
        organizationName: 'Demo Org',
        grantedAt: '2026-08-06T09:00:00.000Z',
      },
    ]);
  });

  it('404s a grant for an unknown app or a deleted organization', async () => {
    const missingApp = build({ app: null });
    await expect(
      missingApp.service.grantToOrganization(
        APP_ID.toString(),
        ORG_ID.toString(),
      ),
    ).rejects.toBeInstanceOf(BusinessException);

    const missingOrg = build({ organization: null });
    await expect(
      missingOrg.service.grantToOrganization(
        APP_ID.toString(),
        ORG_ID.toString(),
      ),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(missingOrg.orgAppsRepository.install).not.toHaveBeenCalled();
  });

  it('revokes with the full uninstall cascade (instances first)', async () => {
    const order: string[] = [];
    const { service, instancesService, orgAppsRepository } = build({
      installs: [],
    });
    instancesService.removeAllForApp.mockImplementation(() => {
      order.push('instances');
      return Promise.resolve();
    });
    orgAppsRepository.uninstall.mockImplementation(() => {
      order.push('uninstall');
      return Promise.resolve();
    });

    await service.revokeFromOrganization(APP_ID.toString(), ORG_ID.toString());

    expect(order).toEqual(['instances', 'uninstall']);
  });

  it('lists a granted non-public app in that organization catalog only', async () => {
    const granted = app();
    const publicApp = app({
      _id: new Types.ObjectId(),
      slug: 'clock',
      isPublic: true,
      updatedAt: new Date('2026-08-02T00:00:00Z'),
    });
    const { service } = build({
      app: granted,
      visibleApps: [publicApp],
      installedAppIds: [granted._id.toString()],
    });

    const catalog = await service.listCatalog(ORG_ID.toString());

    expect(catalog.map((entry) => entry.slug)).toEqual(['clock', 'opsboard']);
    expect(
      catalog.find((entry) => entry.slug === 'opsboard')?.isInstalled,
    ).toBe(true);
  });

  it('keeps the catalog public-only for an org without the grant', async () => {
    const publicApp = app({
      _id: new Types.ObjectId(),
      slug: 'clock',
      isPublic: true,
    });
    const { service, appsRepository } = build({
      visibleApps: [publicApp],
      installedAppIds: [],
    });

    const catalog = await service.listCatalog(ORG_ID.toString());

    expect(catalog.map((entry) => entry.slug)).toEqual(['clock']);
    expect(appsRepository.findManyByIds).toHaveBeenCalledWith([]);
  });
});
