import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { buildConfigZod, buildDefaultConfig } from '@edge/apps-contract';

import { BusinessException } from '../../common/exceptions/business.exception';
import { ConnectionsService } from '../connections/connections.service';
import { GraphWebhookService } from '../connections/webhooks/graph-webhook.service';
import {
  AppInstanceChangedEvent,
  PlayerEvents,
} from '../player/player.events';
import { cacheKeyForInstance } from './connectors/cache-key.util';
import { getConnector } from './connectors/connector-registry';
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
  private readonly logger = new Logger(AppInstancesService.name);

  constructor(
    private readonly instancesRepository: AppInstancesRepository,
    private readonly appsRepository: AppsRepository,
    @Inject(forwardRef(() => GraphWebhookService))
    private readonly graphWebhookService: GraphWebhookService,
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
    private readonly eventEmitter: EventEmitter2,
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
      name: name?.trim() || `${app.name} (${count + 1})`,
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

    // For connected (OAuth) apps the config references a `connectionId`. Verify
    // it belongs to THIS org before persisting — the connector runtime resolves
    // connections unscoped, so an unchecked id would let one org pull another
    // org's private data (calendar/files) onto its own screens.
    await this.assertConnectionOwned(
      organizationId,
      instance.appSlug,
      result.data,
    );

    const updated = await this.instancesRepository.updateById(
      organizationId,
      id,
      { config: result.data, configVersion: app.version },
    );

    void this.ensureWebhookSubscription(organizationId, updated!);

    // Push the new config to every player showing this instance, live. The
    // gateway resolves the affected screens (direct + via playlist) and re-sends
    // their snapshot — without this, edits only appear after a manual reload.
    this.eventEmitter.emit(PlayerEvents.AppInstanceChanged, {
      organizationId,
      instanceId: id,
    } satisfies AppInstanceChangedEvent);

    return toAppInstanceResponse(updated!);
  }

  /**
   * When the app is `connected` (has an OAuth descriptor) and the config carries
   * a `connectionId`, assert that connection belongs to `organizationId`.
   * Cross-org references are rejected as a bad request — closing an IDOR that
   * would otherwise leak another tenant's data through the global connector
   * runtime.
   */
  private async assertConnectionOwned(
    organizationId: string,
    appSlug: string,
    config: Record<string, unknown>,
  ): Promise<void> {
    if (!getConnector(appSlug)?.oauth) {
      return;
    }
    const connectionId = config.connectionId;
    if (typeof connectionId !== 'string' || !connectionId) {
      return;
    }
    await this.connectionsService.assertOwned(organizationId, connectionId);
  }

  /**
   * For a webhook-capable connected app (e.g. OneDrive on Microsoft Graph),
   * register a change subscription so updates push live. Best-effort and
   * out-of-band: a webhook/config issue must never fail the config save, and
   * polling remains the fallback.
   */
  private async ensureWebhookSubscription(
    organizationId: string,
    instance: AppInstanceDocument,
  ): Promise<void> {
    const oauth = getConnector(instance.appSlug)?.oauth;
    if (oauth?.provider !== 'microsoft') {
      return;
    }
    const cacheKey = cacheKeyForInstance(instance);
    const connectionId = instance.config.connectionId;
    const itemId = instance.config.itemId;
    if (
      !cacheKey ||
      typeof connectionId !== 'string' ||
      typeof itemId !== 'string'
    ) {
      return;
    }
    try {
      await this.graphWebhookService.ensureSubscription({
        connectionId,
        organizationId,
        itemId,
        cacheKey,
      });
    } catch (error) {
      this.logger.warn(`Webhook subscription setup failed: ${String(error)}`);
    }
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
