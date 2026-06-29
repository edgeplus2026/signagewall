import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { APP_MANIFESTS } from '@edge/apps';

import { BusinessException } from '../../common/exceptions/business.exception';
import { AppInstancesRepository } from './app-instances.repository';
import { AppsRepository, type CreateAppData } from './apps.repository';
import { OrgAppsRepository } from './org-apps.repository';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import {
  AppAdminResponseDto,
  AppCatalogResponseDto,
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
    private readonly instancesRepository: AppInstancesRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncManifestDefinitions();
  }

  /**
   * On boot, keep each catalog entry's *technical* definition (config schema,
   * version, runtime, data source) in lockstep with its code manifest, so
   * editing a manifest — adding fields/sections, bumping the version — reaches
   * the CMS and validation without a manual re-add. Presentation/governance
   * (name, copy, icon, colour, visibility, categories) stays operator-owned and
   * is never overwritten. New manifests are NOT auto-added: super-admin still
   * curates what enters the catalog.
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
      const unchanged =
        existing.version === manifest.version &&
        existing.runtimeKind === manifest.runtimeKind &&
        existing.dataSource === manifest.dataSource &&
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
    return apps.map((app) =>
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
    await this.orgAppsRepository.uninstall(organizationId, id);
    // Uninstalling removes the org's instances of the app.
    await this.instancesRepository.deleteByApp(organizationId, id);
  }

  private async requirePublicApp(id: string): Promise<AppDocument> {
    const app = await this.appsRepository.findById(id);
    if (!app || !app.isPublic) {
      throw BusinessException.notFound('App not found');
    }
    return app;
  }

  // ----- Super-admin catalog management -----

  async listAll(): Promise<AppAdminResponseDto[]> {
    const apps = await this.appsRepository.findAll();
    return apps.map(toAppAdminResponse);
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
   * Creates a catalog entry from a code manifest. The technical definition is
   * taken from the manifest (by slug); only presentation/governance comes from
   * the request — so the catalog can never hold a phantom app with no code.
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
      tagline: dto.tagline,
      description: dto.description,
      about: dto.about ?? '',
      runtimeKind: manifest.runtimeKind,
      dataSource: manifest.dataSource,
      configSchema: manifest.configSchema,
      version: manifest.version,
      // Presentation defaults come from the manifest; super-admin can override.
      iconSvg: dto.iconSvg ?? manifest.icon ?? '',
      color: dto.color ?? manifest.color ?? '',
      isPublic: dto.isPublic ?? false,
      categoryIds: dto.categoryIds ?? [],
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
