import { Injectable } from '@nestjs/common';
import { buildConfigZod, buildDefaultConfig } from '@edge/apps-contract';

import { BusinessException } from '../../common/exceptions/business.exception';
import { AppInstancesRepository } from './app-instances.repository';
import { AppsRepository } from './apps.repository';
import {
  AppInstanceResponseDto,
  toAppInstanceResponse,
} from './mappers/app-instance.mapper';
import { AppDocument } from './schemas/app.schema';
import { AppInstanceDocument } from './schemas/app-instance.schema';

@Injectable()
export class AppInstancesService {
  constructor(
    private readonly instancesRepository: AppInstancesRepository,
    private readonly appsRepository: AppsRepository,
  ) {}

  async list(
    organizationId: string,
    appId?: string,
  ): Promise<AppInstanceResponseDto[]> {
    const instances = await this.instancesRepository.findByOrganization(
      organizationId,
      appId,
    );
    return instances.map(toAppInstanceResponse);
  }

  async getById(
    organizationId: string,
    id: string,
  ): Promise<AppInstanceResponseDto> {
    return toAppInstanceResponse(
      await this.requireInstance(organizationId, id),
    );
  }

  async create(
    organizationId: string,
    appId: string,
    name?: string,
  ): Promise<AppInstanceResponseDto> {
    const app = await this.requirePublicApp(appId);
    const schema = app.configSchema ?? [];
    const count = await this.instancesRepository.countForApp(
      organizationId,
      appId,
    );

    const instance = await this.instancesRepository.create({
      organizationId,
      appId,
      appSlug: app.slug,
      name: name?.trim() || `Instance ${count + 1}`,
      config: buildDefaultConfig(schema),
      configVersion: app.version,
    });
    return toAppInstanceResponse(instance);
  }

  async rename(
    organizationId: string,
    id: string,
    name: string,
  ): Promise<AppInstanceResponseDto> {
    await this.requireInstance(organizationId, id);
    const updated = await this.instancesRepository.updateById(
      organizationId,
      id,
      { name: name.trim() },
    );
    return toAppInstanceResponse(updated!);
  }

  async updateConfig(
    organizationId: string,
    id: string,
    config: Record<string, unknown>,
  ): Promise<AppInstanceResponseDto> {
    const instance = await this.requireInstance(organizationId, id);
    const app = await this.appsRepository.findById(instance.appId.toString());
    if (!app) {
      throw BusinessException.notFound('App not found');
    }

    const schema = app.configSchema ?? [];
    const result = buildConfigZod(schema).safeParse(config);
    if (!result.success) {
      throw BusinessException.badRequest(
        'Invalid app configuration',
        result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const updated = await this.instancesRepository.updateById(
      organizationId,
      id,
      { config: result.data, configVersion: app.version },
    );
    return toAppInstanceResponse(updated!);
  }

  async duplicate(
    organizationId: string,
    id: string,
  ): Promise<AppInstanceResponseDto> {
    const source = await this.requireInstance(organizationId, id);
    const copy = await this.instancesRepository.create({
      organizationId,
      appId: source.appId.toString(),
      appSlug: source.appSlug,
      name: `${source.name} (copy)`,
      config: { ...source.config },
      configVersion: source.configVersion,
    });
    return toAppInstanceResponse(copy);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const deleted = await this.instancesRepository.deleteById(
      organizationId,
      id,
    );
    if (!deleted) {
      throw BusinessException.notFound('Instance not found');
    }
  }

  private async requireInstance(
    organizationId: string,
    id: string,
  ): Promise<AppInstanceDocument> {
    const instance = await this.instancesRepository.findById(
      organizationId,
      id,
    );
    if (!instance) {
      throw BusinessException.notFound('Instance not found');
    }
    return instance;
  }

  private async requirePublicApp(appId: string): Promise<AppDocument> {
    const app = await this.appsRepository.findById(appId);
    if (!app || !app.isPublic) {
      throw BusinessException.notFound('App not found');
    }
    return app;
  }
}
