import { randomBytes, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppDataService } from '../../apps/app-data.service';
import { ConnectionsService } from '../connections.service';
import { GraphSubscriptionsRepository } from './graph-subscriptions.repository';

const GRAPH_SUBSCRIPTIONS_URL =
  'https://graph.microsoft.com/v1.0/subscriptions';
/** Graph caps drive-item subscriptions well under 3 days; renew with margin. */
const SUBSCRIPTION_TTL_MS = 2 * 24 * 60 * 60 * 1000;
const RENEW_BEFORE_MS = 12 * 60 * 60 * 1000;

interface GraphNotification {
  subscriptionId?: string;
  clientState?: string;
}

@Injectable()
export class GraphWebhookService {
  private readonly logger = new Logger(GraphWebhookService.name);

  constructor(
    private readonly subscriptionsRepository: GraphSubscriptionsRepository,
    private readonly connectionsService: ConnectionsService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AppDataService))
    private readonly appDataService: AppDataService,
  ) {}

  /** True when a public callback URL is configured (webhooks usable). */
  isEnabled(): boolean {
    return Boolean(this.configService.get<string>('publicApiUrl'));
  }

  /**
   * Process change notifications: for each, verify the stored `clientState`
   * before trusting it, then force-refresh the subscription's cache key (which
   * fans out the new data). De-dupes by cache key so a burst of notifications
   * triggers a single refresh per key.
   */
  async handleNotifications(notifications: GraphNotification[]): Promise<void> {
    const cacheKeys = new Set<string>();
    for (const notification of notifications) {
      if (!notification.subscriptionId) continue;
      const sub = await this.subscriptionsRepository.findBySubscriptionId(
        notification.subscriptionId,
      );
      // Reject anything whose clientState doesn't match what we stored
      // (constant-time compare to avoid leaking the secret via timing).
      if (
        !sub ||
        !clientStateMatches(sub.clientState, notification.clientState)
      ) {
        this.logger.warn('Dropping Graph notification with bad clientState');
        continue;
      }
      cacheKeys.add(sub.cacheKey);
    }

    for (const cacheKey of cacheKeys) {
      try {
        await this.appDataService.refreshCacheKey(cacheKey);
      } catch (error) {
        this.logger.warn(
          `Webhook refresh failed for ${cacheKey}: ${String(error)}`,
        );
      }
    }
  }

  /**
   * Create (or replace) a Graph subscription for a OneDrive item so changes
   * push live. No-op when webhooks aren't configured (falls back to polling).
   */
  async ensureSubscription(params: {
    connectionId: string;
    organizationId: string;
    /**
     * The drive the item lives in. Present for OneDrive-for-Business and
     * SharePoint files (which are not in the caller's own `/me/drive`); when
     * omitted we fall back to the connected user's default drive.
     */
    driveId?: string;
    itemId: string;
    cacheKey: string;
  }): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    // Avoid duplicate subscriptions for the same cache key.
    const existing = await this.subscriptionsRepository.findByCacheKey(
      params.cacheKey,
    );
    if (
      existing &&
      existing.expiresAt.getTime() - Date.now() > RENEW_BEFORE_MS
    ) {
      return;
    }

    const connection = await this.connectionsService.resolveConnection(
      params.connectionId,
    );
    const clientState = randomBytes(24).toString('base64url');
    const resource = params.driveId
      ? `/drives/${params.driveId}/items/${params.itemId}`
      : `/me/drive/items/${params.itemId}`;
    const expiresAt = new Date(Date.now() + SUBSCRIPTION_TTL_MS);

    const response = await fetch(GRAPH_SUBSCRIPTIONS_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${connection.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        changeType: 'updated',
        notificationUrl: this.notificationUrl(),
        resource,
        clientState,
        expirationDateTime: expiresAt.toISOString(),
      }),
    });
    if (!response.ok) {
      this.logger.warn(`Graph subscription create failed: ${response.status}`);
      return;
    }
    const created = (await response.json()) as { id?: string };
    if (!created.id) {
      return;
    }

    await this.subscriptionsRepository.create({
      subscriptionId: created.id,
      connectionId: params.connectionId,
      organizationId: params.organizationId,
      resource,
      cacheKey: params.cacheKey,
      clientState,
      expiresAt,
    });
  }

  /** Renew subscriptions nearing expiry (called by the cron). */
  async renewExpiring(now: Date = new Date()): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }
    const due = await this.subscriptionsRepository.findExpiringBefore(
      new Date(now.getTime() + RENEW_BEFORE_MS),
    );
    let renewed = 0;
    for (const sub of due) {
      try {
        const connection = await this.connectionsService.resolveConnection(
          sub.connectionId.toString(),
        );
        const expiresAt = new Date(now.getTime() + SUBSCRIPTION_TTL_MS);
        const response = await fetch(
          `${GRAPH_SUBSCRIPTIONS_URL}/${sub.subscriptionId}`,
          {
            method: 'PATCH',
            headers: {
              authorization: `Bearer ${connection.accessToken}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              expirationDateTime: expiresAt.toISOString(),
            }),
          },
        );
        if (response.ok) {
          await this.subscriptionsRepository.updateExpiry(
            sub.subscriptionId,
            expiresAt,
          );
          renewed += 1;
        } else if (response.status === 404) {
          // Graph dropped it — forget it so it can be recreated on next use.
          await this.subscriptionsRepository.deleteBySubscriptionId(
            sub.subscriptionId,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Subscription renewal failed for ${sub.subscriptionId}: ${String(error)}`,
        );
      }
    }
    return renewed;
  }

  private notificationUrl(): string {
    const base = this.configService.getOrThrow<string>('publicApiUrl');
    const prefix = this.configService.get<string>('apiPrefix') ?? 'api';
    return `${base.replace(/\/$/, '')}/${prefix}/v1/connections/webhooks/graph`;
  }
}

/** Constant-time comparison of the stored vs. notified clientState secret. */
function clientStateMatches(
  expected: string,
  actual: string | undefined,
): boolean {
  if (typeof actual !== 'string') {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  // timingSafeEqual requires equal lengths; unequal length ⇒ no match.
  return a.length === b.length && timingSafeEqual(a, b);
}
