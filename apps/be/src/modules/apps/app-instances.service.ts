import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { buildConfigZod, buildDefaultConfig } from '@signagewall/apps-contract';
import { POWERPOINT_SOURCE_MICROSOFT } from '@signagewall/apps';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import { ConnectionsService } from '../connections/connections.service';
import { unpackDriveItem } from '../connections/providers/graph-api';
import { GraphWebhookService } from '../connections/webhooks/graph-webhook.service';
import {
  AppInstanceChangedEvent,
  PlayerEvents,
  PlaylistChangedEvent,
  ScreenContentChangedEvent,
} from '../player/player.events';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { ScreensService } from '../screens/screens.service';
import { cacheKeyForInstance } from './connectors/cache-key.util';
import { getConnector } from './connectors/connector-registry';
import { cleanupPowerBiSecureState } from './connectors/powerbi-secure.connector';
import { AppDataCacheRepository } from './app-data-cache.repository';
import { isOverlaySlug, overlayScreenIds } from './overlay.util';
import { AppInstancesRepository } from './app-instances.repository';
import { AppsRepository } from './apps.repository';
import { OrgAppsRepository } from './org-apps.repository';
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
    private readonly transactionService: TransactionService,
    private readonly playlistsRepository: PlaylistsRepository,
    @Inject(forwardRef(() => ScreensService))
    private readonly screensService: ScreensService,
    private readonly eventEmitter: EventEmitter2,
    private readonly appDataCacheRepository: AppDataCacheRepository,
    private readonly orgAppsRepository: OrgAppsRepository,
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
    const app = await this.requireEntitledApp(organizationId, appId);
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

    await this.cleanupChangedPrivateConnectorState(instance, result.data);

    // Overlay apps name their screens in config: remember the PREVIOUS
    // assignment so screens dropped by this edit also get a push (the changed
    // event below only resolves the current assignment).
    const previousOverlayScreens = isOverlaySlug(instance.appSlug)
      ? overlayScreenIds(instance.config)
      : [];

    const updated = await this.instancesRepository.updateById(
      organizationId,
      id,
      { config: result.data, configVersion: app.version },
    );

    if (updated) {
      void this.ensureWebhookSubscription(organizationId, updated);
    }

    // Push the new config to every player showing this instance, live. The
    // gateway resolves the affected screens (direct + via playlist + overlay
    // assignment) and re-sends their snapshot — without this, edits only appear
    // after a manual reload.
    this.eventEmitter.emit(PlayerEvents.AppInstanceChanged, {
      organizationId,
      instanceId: id,
    } satisfies AppInstanceChangedEvent);

    // Screens the overlay was REMOVED from re-resolve too, so the band
    // disappears there immediately.
    const nextOverlayScreens = new Set(overlayScreenIds(result.data));
    for (const screenId of previousOverlayScreens) {
      if (!nextOverlayScreens.has(screenId)) {
        this.eventEmitter.emit(PlayerEvents.ScreenContentChanged, {
          organizationId,
          screenId,
        } satisfies ScreenContentChangedEvent);
      }
    }

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
    const config = {
      ...instance.config,
      connectionId,
      // A user can switch an existing embed instance to Microsoft mode and
      // click Connect before the unsaved source select can be persisted. The
      // callback is definitive proof of that choice, so bind the mode with the
      // connection and return to the correct fields after OAuth.
      ...(instance.appSlug === 'powerpoint'
        ? { source: POWERPOINT_SOURCE_MICROSOFT }
        : {}),
    };
    await this.cleanupChangedPrivateConnectorState(instance, config);
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
    await this.cleanupPrivateConnectorState(instance);
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

  /**
   * For a webhook-capable connected app on Microsoft Graph, register a change
   * subscription so updates push live. Two connector shapes:
   *  - a drive item (PowerPoint deck, menu Excel): subscribe to the item's drive
   *    ROOT (Graph only supports drive-root subscriptions; the connector's
   *    content-tag check filters out changes to other files). The file field is
   *    a `remote-select` storing `{ id: "driveId|itemId" }`; we split it so the
   *    subscription addresses the item's own drive (personal OneDrive AND
   *    business/SharePoint).
   *  - an explicit Graph resource (Outlook Calendar: the calendar's event
   *    collection): subscribe to it verbatim with the connector's change types.
   *
   * Best-effort and out-of-band: a webhook/config issue must never fail the
   * config save, and polling (`refreshSeconds`) remains the fallback.
   */
  private async ensureWebhookSubscription(
    organizationId: string,
    instance: AppInstanceDocument,
  ): Promise<void> {
    // The connector itself declares what its current config wants watched
    // (PowerPoint: the picked deck; menu: the Excel workbook; Outlook: the
    // calendar's events — or nothing when its source is manual/Google).
    const resource = getConnector(instance.appSlug)?.webhookResource?.(
      instance.config,
    );
    if (resource?.provider !== 'microsoft') {
      return;
    }
    const cacheKey = cacheKeyForInstance(instance);
    const connectionId = instance.config.connectionId;
    if (!cacheKey || typeof connectionId !== 'string') {
      return;
    }
    try {
      if ('graphResource' in resource) {
        await this.graphWebhookService.ensureSubscription({
          connectionId,
          organizationId,
          resource: resource.graphResource,
          changeType: resource.changeType ?? 'updated',
          cacheKey,
        });
        return;
      }
      const unpacked = unpackDriveItem(resource.packedDriveItem);
      if (!unpacked) {
        return;
      }
      await this.graphWebhookService.ensureSubscription({
        connectionId,
        organizationId,
        driveId: unpacked.driveId,
        cacheKey,
      });
    } catch (error) {
      this.logger.warn(`Webhook subscription setup failed: ${String(error)}`);
    }
  }

  async remove(organizationId: string, id: string): Promise<void> {
    // 404 up front so a bad id can't run a partial cascade.
    const instance = await this.requireInstance(organizationId, id);
    await this.cleanupPrivateConnectorState(instance);

    // Overlay assignment lives in the instance's own config — capture it now so
    // those screens can re-resolve (and drop the band) after the delete.
    const overlayScreens = isOverlaySlug(instance.appSlug)
      ? overlayScreenIds(instance.config)
      : [];

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
    for (const screenId of overlayScreens) {
      this.eventEmitter.emit(PlayerEvents.ScreenContentChanged, {
        organizationId,
        screenId,
      } satisfies ScreenContentChangedEvent);
    }
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
    for (const instance of instances) {
      await this.cleanupPrivateConnectorState(instance);
    }
    const overlayScreens = instances
      .filter((instance) => isOverlaySlug(instance.appSlug))
      .flatMap((instance) => overlayScreenIds(instance.config));

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

    for (const screenId of new Set(overlayScreens)) {
      this.eventEmitter.emit(PlayerEvents.ScreenContentChanged, {
        organizationId,
        screenId,
      } satisfies ScreenContentChangedEvent);
    }
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

  /**
   * Delete an instance's private Power BI objects before its persisted owner is
   * removed. The cache supplies exact refs; the connection supplies ownership.
   * Failure is intentionally blocking so disconnect/uninstall cannot silently
   * orphan customer dashboard exports in private storage.
   */
  private async cleanupPrivateConnectorState(
    instance: AppInstanceDocument,
    cacheKey = cacheKeyForInstance(instance),
  ): Promise<void> {
    if (instance.appSlug !== 'powerbi-secure') {
      return;
    }
    if (!cacheKey) {
      return;
    }
    const [cached] = await this.appDataCacheRepository.findByCacheKeys([
      cacheKey,
    ]);
    if (!cached) {
      return;
    }
    if (cached.slug !== 'powerbi-secure') {
      // A key collision must never let one connector delete another's state.
      throw BusinessException.conflict(
        'Private snapshot cleanup could not verify its cache entry.',
      );
    }
    const connectionId = instance.config.connectionId;
    if (typeof connectionId !== 'string' || !connectionId) {
      throw new Error(
        'Cannot securely delete Power BI state without its owned connection',
      );
    }
    const instanceId = instance._id.toString();
    const owner = await this.connectionsService.getOwnedIdentity(
      instance.organizationId.toString(),
      instanceId,
      connectionId,
    );
    await cleanupPowerBiSecureState(owner, cached.secrets);
    await this.appDataCacheRepository.deleteByCacheKey(cacheKey);
  }

  /**
   * A presentation-only change keeps the same immutable snapshots. A changed
   * connection/workspace/report/page produces a different private cache key,
   * so tear down the old state before saving the new selection.
   */
  private async cleanupChangedPrivateConnectorState(
    instance: AppInstanceDocument,
    nextConfig: Record<string, unknown>,
  ): Promise<void> {
    if (instance.appSlug !== 'powerbi-secure') {
      return;
    }
    const previousKey = cacheKeyForInstance(instance);
    const nextKey = cacheKeyForInstance({
      appSlug: instance.appSlug,
      config: nextConfig,
    });
    if (!previousKey || previousKey === nextKey) {
      return;
    }
    await this.cleanupPrivateConnectorState(instance, previousKey);
  }

  /**
   * An organization may instantiate an app it is entitled to: any public app,
   * or a non-public one it has installed (a super-admin beta grant writes the
   * same install record). Anything else is a 404 — a non-entitled org must
   * not even learn the app exists.
   */
  private async requireEntitledApp(
    organizationId: string,
    appId: string,
  ): Promise<AppDocument> {
    const app = await this.appsRepository.findById(appId);
    if (!app) {
      throw BusinessException.notFound('App not found');
    }
    if (!app.isPublic) {
      const installed = await this.orgAppsRepository.isInstalled(
        organizationId,
        appId,
      );
      if (!installed) {
        throw BusinessException.notFound('App not found');
      }
    }
    return app;
  }
}
