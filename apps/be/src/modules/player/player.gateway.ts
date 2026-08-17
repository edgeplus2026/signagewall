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

import { AnalyticsService } from '../analytics/analytics.service';
import { FunnelEventName } from '../analytics/schemas/funnel-event.schema';
import { AppInstancesRepository } from '../apps/app-instances.repository';
import { isOverlaySlug, overlayScreenIds } from '../apps/overlay.util';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { ScreensRepository } from '../screens/screens.repository';
import { PlayerService } from './player.service';
import type { DiagnosticsReport, ReportedProfile } from './player.service';
import { PlayerEvents, PlayerSocketEvents } from './player.events';
import type {
  AppDataChangedEvent,
  AppInstanceChangedEvent,
  DeviceCommandEvent,
  FleetCommandEvent,
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
   * Present only for the CMS preview iframe. The operator's access token
   * authorizes a read-only spectator on a single screen or playlist — no device
   * is created, no presence/heartbeat is recorded.
   */
  preview?: PreviewAuth;
}

/**
 * Exactly one of `screenId` / `playlistId` identifies what to preview. A screen
 * preview joins that screen's room (live content updates + device mirroring); a
 * playlist preview is a standalone content preview and joins nothing.
 */
interface PreviewAuth {
  screenId?: string;
  playlistId?: string;
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

/**
 * The device's answer to a `sendDiagnostics` command. Loosely typed on purpose:
 * it arrives from a player that may be several versions behind this backend, and
 * a strict shape would reject the report of exactly the device most worth hearing
 * from. The service caps and normalises it.
 */
type DiagnosticsMessage = DiagnosticsReport;

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
/**
 * Origins allowed to open a player socket.
 *
 * Same list the REST API enforces. `cors: { origin: true }` reflected whatever
 * origin asked, so any page on the internet could open a `/player` socket — and
 * since a known `deviceId` is enough to be admitted as that device (the backend
 * re-issues its token, deliberately, so a wiped screen recovers), that was a
 * wider door than the REST side left open.
 *
 * A native shell sends the player origin; a device with no `Origin` header at all
 * — some WebView and Node clients — is allowed through, because there is nothing
 * for CORS to protect against when no browser is enforcing it.
 */
function isAllowedPlayerOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  // No Origin header: a native WebView, a CLI, a server-side client. CORS exists
  // to stop one site reading another's response in a browser; where no browser is
  // enforcing anything there is nothing to withhold, and the device token still
  // governs what the connection may do.
  if (!origin) {
    callback(null, true);
    return;
  }
  // Read per connection rather than at class-decoration time, so the answer can
  // never depend on module import order relative to dotenv.
  //
  // Trailing slashes are stripped on both sides. An `Origin` header never carries
  // one, but a configured URL easily might — and the cost of that mismatch here is
  // not a broken page, it is every screen in the fleet refused at the handshake.
  const allowed = [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    process.env.PLAYER_URL ?? 'http://localhost:5174',
    process.env.MARKETING_URL ?? 'http://localhost:3002',
  ].map((url) => url.trim().replace(/\/+$/, ''));
  callback(null, allowed.includes(origin.replace(/\/+$/, '')));
}

@WebSocketGateway({
  namespace: '/player',
  cors: { origin: isAllowedPlayerOrigin, credentials: true },
})
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
    private readonly analytics: AnalyticsService,
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
   * Admits a CMS preview spectator. Verifies the operator's access token,
   * confirms they belong to the previewed content's organization, then pushes
   * the current snapshot. Crucially it never creates a device, records
   * presence, or starts a heartbeat — so an open preview tab is invisible to
   * the real device's online/offline state.
   *
   * A screen preview additionally joins the `screen:<id>` room, which is what
   * gets it live content updates and the device's now-playing for free, via the
   * same room the device path uses.
   */
  private async handlePreviewConnection(
    client: Socket,
    preview: PreviewAuth,
  ): Promise<void> {
    const userId = this.verifyCmsToken(preview.token);

    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (preview.playlistId) {
      await this.handlePlaylistPreview(client, preview.playlistId, userId);
      return;
    }

    const screenId = preview.screenId;

    if (!screenId) {
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

  /**
   * Admits a preview spectator for a playlist that stands on its own — the CMS
   * content preview, which plays a playlist through the real player without it
   * being assigned to any screen.
   *
   * It joins no room: a playlist has no device to mirror and no screen room to
   * receive pushes on, so the snapshot handed over on connect is the whole
   * conversation. Marked `preview` all the same, so the now-playing relay keeps
   * ignoring it.
   */
  private async handlePlaylistPreview(
    client: Socket,
    playlistId: string,
    userId: string,
  ): Promise<void> {
    try {
      const organizationId =
        await this.playlistsRepository.findOrganizationIdById(playlistId);

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

      (client.data as SocketData).preview = true;

      const snapshot = await this.playerService.resolvePlaylistSnapshot(
        organizationId,
        playlistId,
      );

      if (snapshot) {
        client.emit(PlayerSocketEvents.ContentUpdate, snapshot);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle preview connection for playlist ${playlistId}`,
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
  /**
   * Stores the report the device just assembled. Only from a real device socket:
   * a CMS preview spectator has no device row, and its browser's state is not
   * what anyone asked about.
   */
  @SubscribeMessage(PlayerSocketEvents.Diagnostics)
  async handleDiagnostics(
    client: Socket,
    payload: DiagnosticsMessage,
  ): Promise<void> {
    const { deviceId, preview } = client.data as SocketData;

    if (deviceId && !preview) {
      await this.playerService.recordDiagnostics(deviceId, payload);
    }
  }

  /**
   * Screens whose activation has already been accounted for, in this process.
   *
   * `now-playing` arrives once per slide, per device — several hundred times a
   * second across a fleet — and every one of them used to run two lookups and an
   * insert that the dedupe index then threw away. This set answers the same
   * question for free after the first time. It is bounded by the number of
   * screens connected to this instance and is dropped on restart, where the
   * durable device marker takes over (see {@link recordFirstScreenActivation}).
   */
  private readonly activationRecorded = new Set<string>();

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

    // The first actual item shown by a real paired device is activation — once
    // per screen, ever. Everything after the first is a set lookup.
    if (!this.activationRecorded.has(screenId)) {
      this.activationRecorded.add(screenId);
      void this.recordFirstScreenActivation(screenId, deviceId);
    }
  }

  /**
   * Records the funnel's "screen went live" event, at most once per screen.
   *
   * Two gates, and both matter. The device marker is durable, so a restarted
   * backend does not re-walk the whole fleet's org lookups; it is claimed
   * atomically, so two instances cannot both believe they were first. Only the
   * claimant pays for the org read and the analytics write — which is what makes
   * the ordinary case (a screen that has been running for months) cost one
   * conditional update that matches nothing, instead of three reads and a
   * rejected insert.
   */
  private async recordFirstScreenActivation(
    screenId: string,
    deviceId: string,
  ): Promise<void> {
    try {
      const claimed = await this.playerService.claimScreenActivation(deviceId);
      if (!claimed) {
        return;
      }
      const organizationId =
        await this.screensRepository.findOrganizationIdById(screenId);
      if (!organizationId) return;
      const organization =
        await this.organizationsRepository.findById(organizationId);
      await this.analytics.record({
        eventName: FunnelEventName.FIRST_SCREEN_ACTIVATED,
        userId: organization?.ownerUserId?.toString(),
        organizationId,
        dedupeKey: organization?.ownerUserId
          ? `first_screen_activated:user:${organization.ownerUserId.toString()}`
          : `first_screen_activated:screen:${screenId}`,
      });
    } catch (error) {
      // Analytics must never cost a screen its playback. Forget the in-process
      // marker so a later beat retries rather than silently losing the event.
      this.activationRecorded.delete(screenId);
      this.logger.warn(
        `Could not record activation for screen ${screenId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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

  /**
   * Fleet-wide command: emitted to the whole namespace rather than to rooms.
   *
   * That deliberately includes CMS preview spectators, who are connected here too
   * — but every command routed this way is one the player itself drops in preview
   * mode (see `applyCommand`), so a spectator receiving it does nothing. Filtering
   * them out here would mean tracking which sockets are previews, for no gain.
   *
   * Reaches only what is CONNECTED right now. A screen that is off, offline or
   * asleep updates on its own schedule instead; there is no queue, and callers
   * must not present this as a guarantee.
   */
  @OnEvent(PlayerEvents.FleetCommand)
  onFleetCommand(event: FleetCommandEvent): void {
    this.logger.log(`Fleet command broadcast: ${event.command.type}`);
    this.server.emit(PlayerSocketEvents.Command, event.command);
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
    // The connector cache is global, so the instances on this key can belong to
    // any organization. The key is denormalized onto the document, so this is an
    // indexed lookup — it used to load every instance of the app and compare keys
    // in memory, on every payload refresh.
    const instances = await this.appInstancesRepository.findByCacheKey(
      event.cacheKey,
    );
    const byOrg = new Map<string, string[]>();
    for (const instance of instances) {
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
   * Resolve the distinct screen ids in `organizationId` that show any of
   * `instanceIds` — directly, through a playlist, or as an overlay (an overlay
   * app instance names its screens in its `screens` config). Shared by the
   * app-data and app-instance fan-out handlers.
   */
  private async resolveScreenIdsForInstances(
    organizationId: string,
    instanceIds: string[],
  ): Promise<string[]> {
    const [directScreens, playlistIds, instances] = await Promise.all([
      this.screensRepository.findContainingAppInstanceIds(
        organizationId,
        instanceIds,
      ),
      this.playlistsRepository.findIdsContainingAppInstances(
        organizationId,
        instanceIds,
      ),
      this.appInstancesRepository.findByIds(organizationId, instanceIds),
    ]);

    const playlistScreens =
      playlistIds.length > 0
        ? await this.screensRepository.findContainingPlaylistIds(
            organizationId,
            playlistIds,
          )
        : [];

    const overlayScreens = instances
      .filter((instance) => isOverlaySlug(instance.appSlug))
      .flatMap((instance) => overlayScreenIds(instance.config));

    return [
      ...new Set<string>([
        ...directScreens.map((screen) => screen._id.toString()),
        ...playlistScreens.map((screen) => screen._id.toString()),
        ...overlayScreens,
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

  /**
   * How many screen snapshots are resolved at once during a fan-out.
   *
   * One data refresh can touch every screen on a shared feed — hundreds of them —
   * and each resolution is several queries. Serially that is a fan-out measured
   * in minutes, during which the last screen shows stale content; unbounded it is
   * a self-inflicted burst against the database at the exact moment it is already
   * serving the fleet. Ten keeps the tail short without becoming the spike.
   */
  private static readonly PUSH_CONCURRENCY = 10;

  private async pushManyScreens(
    organizationId: string,
    screenIds: string[],
  ): Promise<void> {
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(PlayerGateway.PUSH_CONCURRENCY, screenIds.length) },
      async () => {
        while (cursor < screenIds.length) {
          const screenId = screenIds[cursor];
          cursor += 1;
          if (!screenId) {
            continue;
          }
          try {
            await this.pushScreenContent(organizationId, screenId);
          } catch (error) {
            // One screen that cannot be resolved — a deleted playlist, a broken
            // reference — must not stop the rest of the fan-out.
            this.logger.warn(
              `Failed to push content to screen ${screenId}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      },
    );
    await Promise.all(workers);
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
