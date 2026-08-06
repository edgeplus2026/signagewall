import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { APP_MANIFESTS } from '@signagewall/apps';

import { BusinessException } from '../../common/exceptions/business.exception';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { AppInstancesService } from './app-instances.service';
import { AppsRepository, type CreateAppData } from './apps.repository';
import { OrgAppsRepository } from './org-apps.repository';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import {
  AppAdminResponseDto,
  AppCatalogResponseDto,
  AppGrantResponseDto,
  toAppAdminResponse,
  toAppCatalogResponse,
} from './mappers/app.mapper';
import { AppDocument } from './schemas/app.schema';

export interface AvailableManifestDto {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** True when this code app already has a catalog entry. */
  alreadyInCatalog: boolean;
}

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
   * On boot, keep each catalog entry's *technical* definition (config schema,
   * version, runtime, data source) plus its icon + brand colour in lockstep
   * with its code manifest, so editing a manifest — adding fields/sections,
   * bumping the version, restyling the icon — reaches the CMS and validation
   * without a manual re-add. Icon and colour are code-owned (defined in the
   * manifest); the remaining governance (name, copy, visibility, categories)
   * stays operator-owned and is never overwritten. New manifests are NOT
   * auto-added: super-admin still curates what enters the catalog.
   */
  private async syncManifestDefinitions(): Promise<void> {
    const bySlug = new Map(
      (await this.appsRepository.findAll()).map((app) => [app.slug, app]),
    );
    for (const manifest of APP_MANIFESTS) {
      const existing = bySlug.get(manifest.slug);
      if (!existing) {
        continue;
      }
      const manifestIcon = manifest.icon ?? '';
      const manifestColor = manifest.color ?? '';
      const unchanged =
        existing.version === manifest.version &&
        existing.runtimeKind === manifest.runtimeKind &&
        existing.dataSource === manifest.dataSource &&
        existing.overlay === (manifest.overlay ?? false) &&
        existing.iconSvg === manifestIcon &&
        existing.color === manifestColor &&
        JSON.stringify(existing.configSchema ?? []) ===
          JSON.stringify(manifest.configSchema);
      if (unchanged) {
        continue;
      }
      await this.appsRepository.updateById(existing._id.toString(), {
        configSchema: manifest.configSchema,
        version: manifest.version,
        runtimeKind: manifest.runtimeKind,
        dataSource: manifest.dataSource,
        overlay: manifest.overlay ?? false,
        iconSvg: manifestIcon,
        color: manifestColor,
      });
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

  // ----- Super-admin catalog management -----

  async listAll(): Promise<AppAdminResponseDto[]> {
    const [apps, installCounts] = await Promise.all([
      this.appsRepository.findAll(),
      this.orgAppsRepository.countInstallsByApp(),
    ]);
    return apps.map((app) =>
      toAppAdminResponse(app, installCounts.get(app._id.toString()) ?? 0),
    );
  }

  /** Code apps available to add to the catalog, flagged if already added. */
  async listAvailableManifests(): Promise<AvailableManifestDto[]> {
    const existing = new Set(await this.appsRepository.findAllSlugs());
    return APP_MANIFESTS.map((manifest) => ({
      slug: manifest.slug,
      name: manifest.name,
      tagline: manifest.tagline,
      description: manifest.description,
      alreadyInCatalog: existing.has(manifest.slug),
    }));
  }

  async getApp(id: string): Promise<AppAdminResponseDto> {
    return toAppAdminResponse(await this.requireApp(id));
  }

  /**
   * Creates a catalog entry from a code manifest. The technical definition and
   * icon/colour are taken from the manifest (by slug); copy (tagline/description/
   * about) and categories are code + i18n, never stored — so the request carries
   * only the name and the public toggle.
   */
  async create(dto: CreateAppDto): Promise<AppAdminResponseDto> {
    const manifest = APP_MANIFESTS.find((entry) => entry.slug === dto.slug);
    if (!manifest) {
      throw BusinessException.badRequest('Unknown app');
    }
    const existing = await this.appsRepository.findBySlug(dto.slug);
    if (existing) {
      throw BusinessException.conflict('This app is already in the catalog');
    }

    const data: CreateAppData = {
      slug: manifest.slug,
      name: dto.name,
      runtimeKind: manifest.runtimeKind,
      dataSource: manifest.dataSource,
      configSchema: manifest.configSchema,
      version: manifest.version,
      // Icon + colour are code-owned: taken from the manifest, not the request.
      iconSvg: manifest.icon ?? '',
      color: manifest.color ?? '',
      isPublic: dto.isPublic ?? false,
    };
    const created = await this.appsRepository.create(data);
    return toAppAdminResponse(created);
  }

  async update(id: string, dto: UpdateAppDto): Promise<AppAdminResponseDto> {
    await this.requireApp(id);
    const updated = await this.appsRepository.updateById(id, dto);
    if (!updated) {
      throw BusinessException.notFound('App not found');
    }
    return toAppAdminResponse(updated);
  }

  async setPublic(id: string, isPublic: boolean): Promise<AppAdminResponseDto> {
    await this.requireApp(id);
    const updated = await this.appsRepository.updateById(id, { isPublic });
    if (!updated) {
      throw BusinessException.notFound('App not found');
    }
    return toAppAdminResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.appsRepository.deleteById(id);
    if (!deleted) {
      throw BusinessException.notFound('App not found');
    }
  }

  private async requireApp(id: string): Promise<AppDocument> {
    const app = await this.appsRepository.findById(id);
    if (!app) {
      throw BusinessException.notFound('App not found');
    }
    return app;
  }
}
