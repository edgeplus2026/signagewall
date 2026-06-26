import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PlaylistsRepository } from '../playlists/playlists.repository';
import { ScreensRepository } from '../screens/screens.repository';
import { PlayerService } from './player.service';
import type { ReportedProfile } from './player.service';
import { PlayerEvents, PlayerSocketEvents } from './player.events';
import type {
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
}

interface SocketData {
  deviceId?: string;
  screenId?: string;
}

interface HeartbeatMessage {
  profile?: ReportedProfile;
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
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const auth = client.handshake.auth as HandshakeAuth;
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

  async handleDisconnect(client: Socket): Promise<void> {
    const { deviceId } = client.data as SocketData;

    if (!deviceId) {
      return;
    }

    // Only mark offline if no other socket for this device remains (guards
    // against quick reconnects flapping the presence flag).
    const remaining = await this.server.in(deviceRoom(deviceId)).fetchSockets();
    if (remaining.length === 0) {
      await this.playerService.markOffline(deviceId);
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

  @OnEvent(PlayerEvents.DevicePaired)
  async onDevicePaired(event: DevicePairedEvent): Promise<void> {
    this.server
      .in(deviceRoom(event.deviceId))
      .socketsJoin(screenRoom(event.screenId));

    this.server.to(deviceRoom(event.deviceId)).emit(PlayerSocketEvents.Paired, {
      screenId: event.screenId,
      token: event.token,
      volume: event.volume,
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
    this.server
      .to(deviceRoom(event.deviceId))
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
