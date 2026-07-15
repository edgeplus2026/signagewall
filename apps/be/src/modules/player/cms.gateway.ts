import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import {
  AiContentEvents,
  type AiContentChangedEvent,
} from '../ai-content/ai-content.events';
import { NotificationEvents } from '../notifications/notifications.events';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { PlayerEvents } from './player.events';
import type { DevicePresenceChangedEvent } from './player.events';

interface CmsHandshakeAuth {
  token?: string;
}

interface CmsTokenPayload {
  sub: string;
  email: string;
}

interface CmsSocketData {
  userId?: string;
  /** Org rooms this socket has been admitted to (membership-checked). */
  organizationIds: Set<string>;
}

/** Realtime event names shared with the CMS client. Keep in lockstep. */
export const CmsSocketEvents = {
  /** Client → server: ask to receive presence for an organization. */
  WatchOrganization: 'org:watch',
  /** Server → client: a device's online/offline status changed. */
  DevicePresence: 'device:presence',
  /** Server → client: the in-app notification set changed; refetch unread count. */
  NotificationsChanged: 'notifications:changed',
  /** Server → client: an AI content generation changed; refetch that job. */
  AiContentChanged: 'ai-content:changed',
} as const;

const orgRoom = (organizationId: string): string => `org:${organizationId}`;

/**
 * Realtime channel for authenticated CMS operators. Unlike the anonymous
 * {@link PlayerGateway}, clients here authenticate with their access token and
 * subscribe to one or more organizations they are members of. The gateway then
 * relays device presence (and future operational events) to the matching
 * `org:<id>` rooms, giving the dashboard a live view without REST polling.
 */
@WebSocketGateway({ namespace: '/cms', cors: { origin: true } })
export class CmsGateway {
  private readonly logger = new Logger(CmsGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  handleConnection(client: Socket): void {
    const { token } = client.handshake.auth as CmsHandshakeAuth;
    const data = client.data as CmsSocketData;
    data.organizationIds = new Set();

    const userId = this.verifyToken(token);
    if (!userId) {
      client.disconnect(true);
      return;
    }

    data.userId = userId;
  }

  @SubscribeMessage(CmsSocketEvents.WatchOrganization)
  async handleWatchOrganization(
    client: Socket,
    payload: { organizationId?: string },
  ): Promise<{ ok: boolean }> {
    const data = client.data as CmsSocketData;
    const organizationId = payload?.organizationId;

    if (!data.userId || !organizationId) {
      return { ok: false };
    }

    if (data.organizationIds.has(organizationId)) {
      return { ok: true };
    }

    const membership = await this.organizationsRepository.findMembership(
      data.userId,
      organizationId,
    );

    if (!membership) {
      return { ok: false };
    }

    data.organizationIds.add(organizationId);
    await client.join(orgRoom(organizationId));
    return { ok: true };
  }

  @OnEvent(PlayerEvents.DevicePresenceChanged)
  onDevicePresenceChanged(event: DevicePresenceChangedEvent): void {
    this.server
      .to(orgRoom(event.organizationId))
      .emit(CmsSocketEvents.DevicePresence, {
        screenId: event.screenId,
        deviceId: event.deviceId,
        online: event.online,
        paired: event.paired ?? true,
        lastSeenAt: event.lastSeenAt,
        ...(event.appVersion ? { appVersion: event.appVersion } : {}),
        ...(event.shellVersion ? { shellVersion: event.shellVersion } : {}),
        // Relay the OTA outcome too, or a rolled-back device stays invisible on
        // the live channel: emitPresence populates it and the CMS badge reads it,
        // but dropping it here meant the amber attention dot only ever appeared on
        // a full page re-seed, never during a rollout.
        ...(event.updateResult ? { updateResult: event.updateResult } : {}),
      });
  }

  /**
   * The globally-visible notification set changed (publish/unpublish/delete).
   * Broadcast a payload-free signal to every authenticated CMS socket so each
   * client refetches its own unread count. Safe for `audience: 'all'`: every
   * `/cms` socket is an authenticated user and no notification data is sent.
   */
  @OnEvent(NotificationEvents.Changed)
  onNotificationsChanged(): void {
    this.server.emit(CmsSocketEvents.NotificationsChanged);
  }

  /**
   * An AI content generation reached a terminal state. Nudge only the sockets
   * watching that generation's organization so the wizard refetches the job —
   * the payload carries no content, just which generation changed.
   */
  @OnEvent(AiContentEvents.Changed)
  onAiContentChanged(event: AiContentChangedEvent): void {
    this.server
      .to(orgRoom(event.organizationId))
      .emit(CmsSocketEvents.AiContentChanged, {
        generationId: event.generationId,
        userId: event.userId,
        status: event.status,
      });
  }

  /** Returns the authenticated user id, or null if the token is missing/invalid. */
  private verifyToken(token: string | undefined): string | null {
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
        `Rejected CMS socket: ${error instanceof Error ? error.message : 'invalid token'}`,
      );
      return null;
    }
  }
}
