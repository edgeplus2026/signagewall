import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { APP_MANIFESTS } from '@signagewall/apps';

import { BusinessException } from '../../common/exceptions/business.exception';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { AppInstancesService } from './app-instances.service';
import { AppsRepository, type CreateAppData } from './apps.repository';
import { OrgAppsRepository } from './org-apps.repository';
import {
  AppAdminResponseDto,
  AppCatalogResponseDto,
  AppGrantResponseDto,
  toAppAdminResponse,
  toAppCatalogResponse,
} from './mappers/app.mapper';
import { AppDocument } from './schemas/app.schema';

@Injectable()
export class AppsService implements OnModuleInit {
  private readonly logger = new Logger(AppsService.name);

  constructor(
    private readonly appsRepository: AppsRepository,
    private readonly orgAppsRepository: OrgAppsRepository,
    private readonly instancesService: AppInstancesService,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncManifestDefinitions();
  }

  /**
   * On boot, mirror the code manifests into the catalog: every app that exists
   * in code gets a catalog entry, and every existing entry's definition (config
   * schema, version, runtime, data source, overlay) plus its name, icon and
   * brand colour is kept in lockstep with its manifest — so adding an app,
   * adding fields/sections, bumping the version or restyling the icon reaches
   * the CMS and validation with a deploy, never a manual step.
   *
   * The catalog is therefore entirely code-owned. The one operator-owned field
   * is `isPublic`: new apps land unpublished and a super-admin decides when
   * organizations may see them. Copy (tagline/description/about) and categories
   * are code + i18n, keyed by slug, and are never stored here.
   */
  private async syncManifestDefinitions(): Promise<void> {
    const bySlug = new Map(
      (await this.appsRepository.findAll()).map((app) => [app.slug, app]),
    );
    for (const manifest of APP_MANIFESTS) {
      const definition = {
        name: manifest.name,
        configSchema: manifest.configSchema,
        version: manifest.version,
        runtimeKind: manifest.runtimeKind,
        dataSource: manifest.dataSource,
        overlay: manifest.overlay ?? false,
        iconSvg: manifest.icon ?? '',
        color: manifest.color ?? '',
      };

      const existing = bySlug.get(manifest.slug);
      if (!existing) {
        // A brand-new code app: added unpublished so it is invisible to
        // organizations until a super-admin flips the public toggle.
        const data: CreateAppData = {
          slug: manifest.slug,
          ...definition,
          isPublic: false,
        };
        await this.appsRepository.create(data);
        this.logger.log(`Added app "${manifest.slug}" to the catalog`);
        continue;
      }

      const unchanged =
        existing.name === definition.name &&
        existing.version === definition.version &&
        existing.runtimeKind === definition.runtimeKind &&
        existing.dataSource === definition.dataSource &&
        existing.overlay === definition.overlay &&
        existing.iconSvg === definition.iconSvg &&
        existing.color === definition.color &&
        JSON.stringify(existing.configSchema ?? []) ===
          JSON.stringify(definition.configSchema);
      if (unchanged) {
        continue;
      }
      await this.appsRepository.updateById(existing._id.toString(), definition);
      this.logger.log(`Synced manifest definition for app "${manifest.slug}"`);
    }
  }

  // ----- Organization-facing catalog (public apps) -----

  async listCatalog(organizationId: string): Promise<AppCatalogResponseDto[]> {
    const [apps, installedIds] = await Promise.all([
      this.appsRepository.findVisible(),
      this.orgAppsRepository.findInstalledAppIds(organizationId),
    ]);
    const installed = new Set(installedIds);

    // A granted non-public app (beta/design-partner entitlement) belongs in
    // that organization's catalog even though it is invisible everywhere else.
    const visibleIds = new Set(apps.map((app) => app._id.toString()));
    const grantedOnly = await this.appsRepository.findManyByIds(
      installedIds.filter((id) => !visibleIds.has(id)),
    );

    return [...apps, ...grantedOnly]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map((app) =>
        toAppCatalogResponse(app, installed.has(app._id.toString())),
      );
  }

  /**
   * Resolves an app for an organization. Public apps are always resolvable;
   * a non-public app is still resolvable if the org has it installed — so
   * unpublishing never locks an org out of its existing instances.
   */
  async getCatalogApp(
    organizationId: string,
    id: string,
  ): Promise<AppCatalogResponseDto> {
    const app = await this.appsRepository.findById(id);
    if (!app) {
      throw BusinessException.notFound('App not found');
    }
    const isInstalled = await this.orgAppsRepository.isInstalled(
      organizationId,
      id,
    );
    if (!app.isPublic && !isInstalled) {
      throw BusinessException.notFound('App not found');
    }
    return toAppCatalogResponse(app, isInstalled);
  }

  async install(
    organizationId: string,
    id: string,
    userId?: string,
  ): Promise<AppCatalogResponseDto> {
    const app = await this.requirePublicApp(id);
    await this.orgAppsRepository.install(organizationId, id, userId);
    return toAppCatalogResponse(app, true);
  }

  async uninstall(organizationId: string, id: string): Promise<void> {
    // Uninstalling removes the org's instances of the app — cascading the same
    // way a single delete does, so it never leaves dangling references in
    // playlists/screens or orphaned OAuth connections behind. Remove instances
    // first so a private-storage failure leaves the installation and persisted
    // owner identity intact for a safe retry.
    await this.instancesService.removeAllForApp(organizationId, id);
    await this.orgAppsRepository.uninstall(organizationId, id);
  }

  private async requirePublicApp(id: string): Promise<AppDocument> {
    const app = await this.appsRepository.findById(id);
    if (!app || !app.isPublic) {
      throw BusinessException.notFound('App not found');
    }
    return app;
  }

  // ----- Super-admin grants (beta entitlements for non-public apps) -----

  /**
   * Organizations entitled to this app. A grant IS an install record created
   * by a super-admin — the same row the normal install flow writes — so the
   * whole downstream stack (catalog resolution, instance creation, uninstall
   * cascade) treats a granted org exactly like one that installed a public
   * app. Only the entry path differs: `install` stays public-app-only.
   */
  async listGrants(appId: string): Promise<AppGrantResponseDto[]> {
    const app = await this.appsRepository.findById(appId);
    if (!app) {
      throw BusinessException.notFound('App not found');
    }

    const installs = await this.orgAppsRepository.findInstallsForApp(appId);
    const organizations = await this.organizationsRepository.findManyByIds(
      installs.map((install) => install.organizationId.toString()),
    );
    const names = new Map(
      organizations.map((org) => [org._id.toString(), org.name]),
    );

    return installs.flatMap((install) => {
      const organizationId = install.organizationId.toString();
      const name = names.get(organizationId);
      // Installs of soft-deleted orgs are invisible here; they are cleaned up
      // by org deletion, not by the grant surface.
      return name === undefined
        ? []
        : [
            {
              organizationId,
              organizationName: name,
              grantedAt: install.createdAt.toISOString(),
            },
          ];
    });
  }

  /** Entitles one named organization to a (typically non-public) app. */
  async grantToOrganization(
    appId: string,
    organizationId: string,
    grantedBy?: string,
  ): Promise<AppGrantResponseDto[]> {
    const app = await this.appsRepository.findById(appId);
    if (!app) {
      throw BusinessException.notFound('App not found');
    }

    const organization =
      await this.organizationsRepository.findById(organizationId);
    if (!organization) {
      throw BusinessException.notFound('Organization not found');
    }

    await this.orgAppsRepository.install(organizationId, appId, grantedBy);
    this.logger.log(
      `App ${app.slug} granted to organization ${organizationId}`,
    );
    return this.listGrants(appId);
  }

  /**
   * Revokes an entitlement with the full uninstall cascade: the org's
   * instances (and their private connector state) go with it, so a revoked
   * design partner cannot keep playing content from an app they no longer
   * have.
   */
  async revokeFromOrganization(
    appId: string,
    organizationId: string,
  ): Promise<AppGrantResponseDto[]> {
    const app = await this.appsRepository.findById(appId);
    if (!app) {
      throw BusinessException.notFound('App not found');
    }

    await this.uninstall(organizationId, appId);
    this.logger.log(
      `App ${app.slug} revoked from organization ${organizationId}`,
    );
    return this.listGrants(appId);
  }

  // ----- Super-admin catalog governance (read + the public toggle) -----

  async listAll(): Promise<AppAdminResponseDto[]> {
    const [apps, installCounts] = await Promise.all([
      this.appsRepository.findAll(),
      this.orgAppsRepository.countInstallsByApp(),
    ]);
    return apps.map((app) =>
      toAppAdminResponse(app, installCounts.get(app._id.toString()) ?? 0),
    );
  }

  async getApp(id: string): Promise<AppAdminResponseDto> {
    return toAppAdminResponse(await this.requireApp(id));
  }

  async setPublic(id: string, isPublic: boolean): Promise<AppAdminResponseDto> {
    await this.requireApp(id);
    const updated = await this.appsRepository.updateById(id, { isPublic });
    if (!updated) {
      throw BusinessException.notFound('App not found');
    }
    return toAppAdminResponse(updated);
  }

  private async requireApp(id: string): Promise<AppDocument> {
    const app = await this.appsRepository.findById(id);
    if (!app) {
      throw BusinessException.notFound('App not found');
    }
    return app;
  }
}
