import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { buildConfigZod, buildDefaultConfig } from '@edge/apps-contract';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import { ConnectionsService } from '../connections/connections.service';
import {
  AppInstanceChangedEvent,
  PlayerEvents,
  PlaylistChangedEvent,
  ScreenContentChangedEvent,
} from '../player/player.events';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { ScreensService } from '../screens/screens.service';
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
  constructor(
    private readonly instancesRepository: AppInstancesRepository,
    private readonly appsRepository: AppsRepository,
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
    private readonly transactionService: TransactionService,
    private readonly playlistsRepository: PlaylistsRepository,
    @Inject(forwardRef(() => ScreensService))
    private readonly screensService: ScreensService,
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
    // Pass `config` so conditionally-hidden (visibleWhen) fields aren't enforced.
    const result = buildConfigZod(schema, config).safeParse(config);
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
      id,
      instance.appSlug,
      result.data,
    );

    const updated = await this.instancesRepository.updateById(
      organizationId,
      id,
      { config: result.data, configVersion: app.version },
    );

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
   * Bind a freshly created OAuth connection to an instance's config (called from
   * the connections callback after `handleCallback`). Writes only `connectionId`
   * — the rest of the form (e.g. Canva's `design`) is filled in by the operator
   * afterwards, so this intentionally skips full-schema validation. The
   * connection must already be owned by this instance (per-instance ownership).
   */
  async bindConnection(
    organizationId: string,
    instanceId: string,
    connectionId: string,
  ): Promise<AppInstanceResponseDto> {
    const instance = await this.requireInstance(organizationId, instanceId);
    await this.connectionsService.assertOwnedByInstance(
      organizationId,
      instanceId,
      connectionId,
    );
    const config = { ...instance.config, connectionId };
    const updated = await this.instancesRepository.updateById(
      organizationId,
      instanceId,
      { config },
    );
    this.eventEmitter.emit(PlayerEvents.AppInstanceChanged, {
      organizationId,
      instanceId,
    } satisfies AppInstanceChangedEvent);
    return toAppInstanceResponse(updated!);
  }

  /**
   * Disconnect an instance's account: delete its owned connection and clear
   * `connectionId` from its config (the config form then shows the connect
   * prompt again).
   */
  async disconnect(
    organizationId: string,
    instanceId: string,
  ): Promise<AppInstanceResponseDto> {
    const instance = await this.requireInstance(organizationId, instanceId);
    await this.connectionsService.deleteByInstance(organizationId, instanceId);
    const config = { ...instance.config };
    delete config.connectionId;
    const updated = await this.instancesRepository.updateById(
      organizationId,
      instanceId,
      { config },
    );
    this.eventEmitter.emit(PlayerEvents.AppInstanceChanged, {
      organizationId,
      instanceId,
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
    instanceId: string,
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
    // Per-instance ownership: the connection must belong to THIS instance (and
    // org) — closing an IDOR that would otherwise let one instance reference
    // another instance's (or tenant's) private connection.
    await this.connectionsService.assertOwnedByInstance(
      organizationId,
      instanceId,
      connectionId,
    );
  }

  async remove(organizationId: string, id: string): Promise<void> {
    // 404 up front so a bad id can't run a partial cascade.
    await this.requireInstance(organizationId, id);

    // Purge the instance's references from playlists and screens, then delete it
    // — all in one transaction so content never points at a missing instance.
    let affectedScreenIds: string[] = [];
    let affectedPlaylistIds: string[] = [];
    await this.transactionService.run(async (session) => {
      affectedScreenIds = await this.screensService.purgeAppInstanceReferences(
        organizationId,
        [id],
        session,
      );
      affectedPlaylistIds = await this.playlistsRepository.removeAppInstances(
        organizationId,
        [id],
        session,
      );
      const deleted = await this.instancesRepository.deleteById(
        organizationId,
        id,
        session,
      );
      if (!deleted) {
        throw BusinessException.notFound('Instance not found');
      }
    });

    // Strict per-instance ownership: drop the connection this instance owned.
    await this.connectionsService.deleteByInstance(organizationId, id);

    // Emit after commit so the realtime resolver reads post-delete state. Screens
    // that held the app directly re-resolve; playlists that held it notify every
    // screen referencing them.
    for (const screenId of affectedScreenIds) {
      this.eventEmitter.emit(PlayerEvents.ScreenContentChanged, {
        organizationId,
        screenId,
      } satisfies ScreenContentChangedEvent);
    }
    for (const playlistId of affectedPlaylistIds) {
      this.eventEmitter.emit(PlayerEvents.PlaylistChanged, {
        organizationId,
        playlistId,
      } satisfies PlaylistChangedEvent);
    }
  }

  /**
   * Remove EVERY instance of an app for an org, cascading the same way as
   * {@link remove}: purge the instances' references from playlists and screens,
   * delete the instances, and drop their owned connections. Used when an app is
   * uninstalled so uninstall can never leave dangling references or orphaned
   * connections behind.
   */
  async removeAllForApp(organizationId: string, appId: string): Promise<void> {
    const instances = await this.instancesRepository.findByApp(
      organizationId,
      appId,
    );
    if (instances.length === 0) {
      return;
    }
    const instanceIds = instances.map((instance) => instance._id.toString());

    let affectedScreenIds: string[] = [];
    let affectedPlaylistIds: string[] = [];
    await this.transactionService.run(async (session) => {
      affectedScreenIds = await this.screensService.purgeAppInstanceReferences(
        organizationId,
        instanceIds,
        session,
      );
      affectedPlaylistIds = await this.playlistsRepository.removeAppInstances(
        organizationId,
        instanceIds,
        session,
      );
      await this.instancesRepository.deleteByApp(
        organizationId,
        appId,
        session,
      );
    });

    // Strict per-instance ownership: drop every connection these instances owned.
    await this.connectionsService.deleteByInstances(
      organizationId,
      instanceIds,
    );

    for (const screenId of affectedScreenIds) {
      this.eventEmitter.emit(PlayerEvents.ScreenContentChanged, {
        organizationId,
        screenId,
      } satisfies ScreenContentChangedEvent);
    }
    for (const playlistId of affectedPlaylistIds) {
      this.eventEmitter.emit(PlayerEvents.PlaylistChanged, {
        organizationId,
        playlistId,
      } satisfies PlaylistChangedEvent);
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
