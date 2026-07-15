import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AppInstancesRepository } from '../apps/app-instances.repository';
import { cacheKeyForInstance } from '../apps/connectors/cache-key.util';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { ScreensRepository } from '../screens/screens.repository';
import { PlayerService } from './player.service';
import type { ReportedProfile } from './player.service';
import { PlayerEvents, PlayerSocketEvents } from './player.events';
import type {
  AppDataChangedEvent,
  AppInstanceChangedEvent,
  DeviceCommandEvent,
  DevicePairedEvent,
  DeviceRevokedEvent,
  MediaReadyEvent,
  PlaylistChangedEvent,
  ScreenContentChangedEvent,
  ScreensDeletedEvent,
} from './player.events';

interface HandshakeAuth {
  deviceId?: string;
  token?: string;
  revision?: string;
  profile?: ReportedProfile;
  /**
   * Present only for the CMS live-preview iframe. The operator's access token
   * authorizes a read-only spectator on a single screen — no device is created,
   * no presence/heartbeat is recorded.
   */
  preview?: PreviewAuth;
}

interface PreviewAuth {
  screenId?: string;
  token?: string;
}

interface CmsTokenPayload {
  sub: string;
  email: string;
}

interface SocketData {
  deviceId?: string;
  screenId?: string;
  /** True for a CMS preview spectator (skips presence/heartbeat bookkeeping). */
  preview?: boolean;
}

interface HeartbeatMessage {
  profile?: ReportedProfile;
}

interface NowPlayingMessage {
  itemId?: string;
}

const deviceRoom = (deviceId: string): string => `device:${deviceId}`;
const screenRoom = (screenId: string): string => `screen:${screenId}`;

/**
 * The realtime player channel. Players connect anonymously with their stable
 * deviceId (+ token once paired); the gateway either hands back a pairing code
 * or pushes the resolved content snapshot. Content-owning modules never touch
 * this class — they emit in-process events that the `@OnEvent` handlers fan out
 * to the affected `screen:<id>` / `device:<id>` rooms.
 */
@WebSocketGateway({ namespace: '/player', cors: { origin: true } })
export class PlayerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PlayerGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly playerService: PlayerService,
    private readonly screensRepository: ScreensRepository,
    private readonly playlistsRepository: PlaylistsRepository,
    private readonly appInstancesRepository: AppInstancesRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const auth = client.handshake.auth as HandshakeAuth;

    // CMS live-preview spectator: authorized by the operator's access token,
    // bound to a single screen. Handled before the device path so it never
    // touches device/presence bookkeeping.
    if (auth.preview) {
      await this.handlePreviewConnection(client, auth.preview);
      return;
    }

    const deviceId = auth.deviceId;

    if (!deviceId) {
      client.disconnect(true);
      return;
    }

    const data = client.data as SocketData;
    data.deviceId = deviceId;
    await client.join(deviceRoom(deviceId));

    try {
      const result = await this.playerService.handleConnect(
        deviceId,
        auth.token,
        auth.profile,
      );

      if (result.kind === 'unpaired') {
        if (result.tokenWasInvalid) {
          client.emit(PlayerSocketEvents.Revoked);
        }
        client.emit(PlayerSocketEvents.PairingCode, {
          code: result.code,
          expiresAt: result.expiresAt.toISOString(),
        });
        return;
      }

      data.screenId = result.screenId;
      await client.join(screenRoom(result.screenId));
      client.emit(PlayerSocketEvents.Paired, {
        screenId: result.screenId,
        volume: result.volume,
        settings: result.settings,
        ...(result.token ? { token: result.token } : {}),
      });

      if (result.snapshot.revision !== auth.revision) {
        client.emit(PlayerSocketEvents.ContentUpdate, result.snapshot);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle connection for device ${deviceId}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.disconnect(true);
    }
  }

  /**
   * Admits a CMS live-preview spectator. Verifies the operator's access token,
   * confirms they belong to the screen's organization, then joins the
   * `screen:<id>` room read-only and pushes the current snapshot. Live content
   * updates arrive for free via the same room the device path uses. Crucially
   * it never creates a device, records presence, or starts a heartbeat — so an
   * open preview tab is invisible to the real device's online/offline state.
   */
  private async handlePreviewConnection(
    client: Socket,
    preview: PreviewAuth,
  ): Promise<void> {
    const screenId = preview.screenId;
    const userId = this.verifyCmsToken(preview.token);

    if (!screenId || !userId) {
      client.disconnect(true);
      return;
    }

    try {
      const organizationId =
        await this.screensRepository.findOrganizationIdById(screenId);

      if (!organizationId) {
        client.disconnect(true);
        return;
      }

      const membership = await this.organizationsRepository.findMembership(
        userId,
        organizationId,
      );

      if (!membership) {
        client.disconnect(true);
        return;
      }

      const data = client.data as SocketData;
      data.preview = true;
      data.screenId = screenId;
      await client.join(screenRoom(screenId));

      const snapshot = await this.playerService.resolveSnapshot(
        organizationId,
        screenId,
      );

      if (snapshot) {
        client.emit(PlayerSocketEvents.ContentUpdate, snapshot);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle preview connection for screen ${screenId}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.disconnect(true);
    }
  }

  /** Returns the authenticated user id, or null if the token is missing/invalid. */
  private verifyCmsToken(token: string | undefined): string | null {
    if (!token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<CmsTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      });
      return payload.sub;
    } catch (error) {
      this.logger.debug(
        `Rejected preview socket: ${
          error instanceof Error ? error.message : 'invalid token'
        }`,
      );
      return null;
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const { deviceId } = client.data as SocketData;

    if (!deviceId) {
      return;
    }

    // This is a lifecycle hook, NOT a @SubscribeMessage, so Nest's
    // WsExceptionsHandler does not wrap it — an unhandled rejection here crashes
    // the whole process. Swallow + log so a transient DB/adapter outage (e.g. the
    // Atlas connection dropping) can't take the gateway down for the whole fleet.
    try {
      // Only mark offline if no other socket for this device remains (guards
      // against quick reconnects flapping the presence flag).
      const remaining = await this.server
        .in(deviceRoom(deviceId))
        .fetchSockets();
      if (remaining.length === 0) {
        await this.playerService.markOffline(deviceId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle disconnect for device ${deviceId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @SubscribeMessage(PlayerSocketEvents.Heartbeat)
  async handleHeartbeat(
    client: Socket,
    payload: HeartbeatMessage,
  ): Promise<void> {
    const { deviceId } = client.data as SocketData;

    if (deviceId) {
      await this.playerService.recordHeartbeat(deviceId, payload?.profile);
    }
  }

  /**
   * The real device reports the item it just put on screen. We relay it to the
   * screen room so CMS preview spectators jump to the same item, mirroring the
   * device 1:1 (the preview runs no clock of its own). Only honored from a real
   * device socket — a preview spectator must never drive this.
   */
  @SubscribeMessage(PlayerSocketEvents.NowPlaying)
  handleNowPlaying(client: Socket, payload: NowPlayingMessage): void {
    const { deviceId, screenId, preview } = client.data as SocketData;
    const itemId = payload?.itemId;

    if (preview || !deviceId || !screenId || !itemId) {
      return;
    }

    // broadcast = everyone in the room except the sender (the device itself).
    client.broadcast
      .to(screenRoom(screenId))
      .emit(PlayerSocketEvents.NowPlaying, { itemId });
  }

  /**
   * A freshly-joined preview spectator asks for the current item. Relay the
   * request to the screen room so the real device re-announces its now-playing,
   * letting the preview sync immediately rather than after the next transition.
   */
  @SubscribeMessage(PlayerSocketEvents.NowPlayingRequest)
  handleNowPlayingRequest(client: Socket): void {
    const { screenId, preview } = client.data as SocketData;

    if (!preview || !screenId) {
      return;
    }

    client.broadcast
      .to(screenRoom(screenId))
      .emit(PlayerSocketEvents.NowPlayingRequest);
  }

  @OnEvent(PlayerEvents.DevicePaired)
  async onDevicePaired(event: DevicePairedEvent): Promise<void> {
    this.server
      .in(deviceRoom(event.deviceId))
      .socketsJoin(screenRoom(event.screenId));

    this.server.to(deviceRoom(event.deviceId)).emit(PlayerSocketEvents.Paired, {
      screenId: event.screenId,
      token: event.token,
      volume: event.volume,
      settings: event.settings,
    });

    await this.pushScreenContent(event.organizationId, event.screenId);
  }

  @OnEvent(PlayerEvents.DeviceRevoked)
  onDeviceRevoked(event: DeviceRevokedEvent): void {
    // Tell the device to drop its token, then close the connection so it
    // re-handshakes (now token-less) and receives a fresh pairing code. The
    // reconnect path re-delivers the revoke, so this converges even if the
    // event packet is missed. Disconnecting also removes it from every room.
    this.server.to(deviceRoom(event.deviceId)).emit(PlayerSocketEvents.Revoked);
    this.server.in(deviceRoom(event.deviceId)).disconnectSockets(true);
  }

  @OnEvent(PlayerEvents.DeviceCommand)
  onDeviceCommand(event: DeviceCommandEvent): void {
    // Fan out to the device AND the screen room. The device room drives the
    // physical display; the screen room keeps any CMS preview spectators in
    // lockstep (live orientation/scale + remote next/prev) without registering
    // them as devices.
    this.server
      .to(deviceRoom(event.deviceId))
      .to(screenRoom(event.screenId))
      .emit(PlayerSocketEvents.Command, event.command);
  }

  @OnEvent(PlayerEvents.ScreenContentChanged)
  async onScreenContentChanged(
    event: ScreenContentChangedEvent,
  ): Promise<void> {
    await this.pushScreenContent(event.organizationId, event.screenId);
  }

  @OnEvent(PlayerEvents.PlaylistChanged)
  async onPlaylistChanged(event: PlaylistChangedEvent): Promise<void> {
    const screens = await this.screensRepository.findContainingPlaylistIds(
      event.organizationId,
      [event.playlistId],
    );

    await this.pushManyScreens(
      event.organizationId,
      screens.map((screen) => screen._id.toString()),
    );
  }

  @OnEvent(PlayerEvents.MediaReady)
  async onMediaReady(event: MediaReadyEvent): Promise<void> {
    const [directScreens, playlistIds] = await Promise.all([
      this.screensRepository.findContainingMediaIds(event.organizationId, [
        event.mediaId,
      ]),
      this.playlistsRepository.findIdsContainingMedia(event.organizationId, [
        event.mediaId,
      ]),
    ]);

    const playlistScreens =
      playlistIds.length > 0
        ? await this.screensRepository.findContainingPlaylistIds(
            event.organizationId,
            playlistIds,
          )
        : [];

    const screenIds = new Set<string>([
      ...directScreens.map((screen) => screen._id.toString()),
      ...playlistScreens.map((screen) => screen._id.toString()),
    ]);

    await this.pushManyScreens(event.organizationId, [...screenIds]);
  }

  @OnEvent(PlayerEvents.AppDataChanged)
  async onAppDataChanged(event: AppDataChangedEvent): Promise<void> {
    // The connector cache is global, so find every instance of this app (across
    // all orgs) that resolves to the changed cache key, then re-push the screens
    // that use those instances — grouped by org so each push stays org-correct.
    const instances = await this.appInstancesRepository.findBySlugs([
      event.slug,
    ]);
    const byOrg = new Map<string, string[]>();
    for (const instance of instances) {
      if (cacheKeyForInstance(instance) !== event.cacheKey) {
        continue;
      }
      const orgId = instance.organizationId.toString();
      const ids = byOrg.get(orgId) ?? [];
      ids.push(instance._id.toString());
      byOrg.set(orgId, ids);
    }

    for (const [organizationId, instanceIds] of byOrg) {
      const screenIds = await this.resolveScreenIdsForInstances(
        organizationId,
        instanceIds,
      );
      await this.pushManyScreens(organizationId, screenIds);
    }
  }

  @OnEvent(PlayerEvents.AppInstanceChanged)
  async onAppInstanceChanged(event: AppInstanceChangedEvent): Promise<void> {
    // Re-push every screen in this org that uses the edited instance (directly
    // or via a playlist), so the new config reaches players live.
    const screenIds = await this.resolveScreenIdsForInstances(
      event.organizationId,
      [event.instanceId],
    );
    await this.pushManyScreens(event.organizationId, screenIds);
  }

  /**
   * Resolve the distinct screen ids in `organizationId` that contain any of
   * `instanceIds`, directly or through a playlist. Shared by the app-data and
   * app-instance fan-out handlers.
   */
  private async resolveScreenIdsForInstances(
    organizationId: string,
    instanceIds: string[],
  ): Promise<string[]> {
    const [directScreens, playlistIds] = await Promise.all([
      this.screensRepository.findContainingAppInstanceIds(
        organizationId,
        instanceIds,
      ),
      this.playlistsRepository.findIdsContainingAppInstances(
        organizationId,
        instanceIds,
      ),
    ]);

    const playlistScreens =
      playlistIds.length > 0
        ? await this.screensRepository.findContainingPlaylistIds(
            organizationId,
            playlistIds,
          )
        : [];

    return [
      ...new Set<string>([
        ...directScreens.map((screen) => screen._id.toString()),
        ...playlistScreens.map((screen) => screen._id.toString()),
      ]),
    ];
  }

  @OnEvent(PlayerEvents.ScreensDeleted)
  async onScreensDeleted(event: ScreensDeletedEvent): Promise<void> {
    for (const screenId of event.screenIds) {
      await this.playerService.unpairScreenDevice(
        event.organizationId,
        screenId,
      );
    }
  }

  private async pushManyScreens(
    organizationId: string,
    screenIds: string[],
  ): Promise<void> {
    for (const screenId of screenIds) {
      await this.pushScreenContent(organizationId, screenId);
    }
  }

  private async pushScreenContent(
    organizationId: string,
    screenId: string,
  ): Promise<void> {
    const snapshot = await this.playerService.resolveSnapshot(
      organizationId,
      screenId,
    );

    if (snapshot) {
      this.server
        .to(screenRoom(screenId))
        .emit(PlayerSocketEvents.ContentUpdate, snapshot);
    }
  }
}
