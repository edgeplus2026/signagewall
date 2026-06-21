import { Injectable } from '@nestjs/common';
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
import { AppDocument, AppStatus } from './schemas/app.schema';

export interface AvailableManifestDto {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** True when this code app already has a catalog entry. */
  alreadyInCatalog: boolean;
}

@Injectable()
export class AppsService {
  constructor(
    private readonly appsRepository: AppsRepository,
    private readonly orgAppsRepository: OrgAppsRepository,
    private readonly instancesRepository: AppInstancesRepository,
  ) {}

  // ----- Organization-facing catalog (public + published) -----

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

  async getCatalogApp(
    organizationId: string,
    id: string,
  ): Promise<AppCatalogResponseDto> {
    const app = await this.requireVisibleApp(id);
    const isInstalled = await this.orgAppsRepository.isInstalled(
      organizationId,
      id,
    );
    return toAppCatalogResponse(app, isInstalled);
  }

  async install(
    organizationId: string,
    id: string,
    userId?: string,
  ): Promise<AppCatalogResponseDto> {
    const app = await this.requireVisibleApp(id);
    await this.orgAppsRepository.install(organizationId, id, userId);
    return toAppCatalogResponse(app, true);
  }

  async uninstall(organizationId: string, id: string): Promise<void> {
    await this.orgAppsRepository.uninstall(organizationId, id);
    // Uninstalling removes the org's instances of the app.
    await this.instancesRepository.deleteByApp(organizationId, id);
  }

  private async requireVisibleApp(id: string): Promise<AppDocument> {
    const app = await this.appsRepository.findById(id);
    if (!app || !app.isPublic || app.status !== AppStatus.PUBLISHED) {
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
      ...(dto.iconUrl ? { iconUrl: dto.iconUrl } : {}),
      screenshots: dto.screenshots ?? [],
      isPublic: dto.isPublic ?? false,
      status: dto.status ?? AppStatus.DRAFT,
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
