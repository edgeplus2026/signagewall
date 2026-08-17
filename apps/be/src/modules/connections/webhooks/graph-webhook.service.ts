import { randomBytes, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppDataService } from '../../apps/app-data.service';
import type { GraphSubscriptionDocument } from '../schemas/graph-subscription.schema';
import { ConnectionsService } from '../connections.service';
import { GraphSubscriptionsRepository } from './graph-subscriptions.repository';

const GRAPH_SUBSCRIPTIONS_URL =
  'https://graph.microsoft.com/v1.0/subscriptions';
/**
 * Graph caps subscription lifetime under 3 days for both drive items and
 * calendar events (~4230 min ≈ 2.94 days); 2 days fits both, renewed with
 * margin by {@link GraphSubscriptionScheduler}.
 */
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
    return Boolean(this.callbackBaseUrl());
  }

  /**
   * Base URL Graph can reach for notifications. `webhookPublicUrl` (a dev
   * tunnel, e.g. cloudflared/ngrok) overrides `publicApiUrl` so webhooks can be
   * exercised locally while OAuth callbacks stay on localhost.
   */
  private callbackBaseUrl(): string | undefined {
    return (
      this.configService.get<string>('webhookPublicUrl') ||
      this.configService.get<string>('publicApiUrl') ||
      undefined
    );
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
   * Create (or replace) a Graph subscription so provider changes push live.
   *
   * Two resource shapes, picked by the caller:
   *  - `driveId` (OneDrive/SharePoint files): Graph does NOT support driveItem
   *    subscriptions on individual files — only on the drive ROOT — so we
   *    subscribe to the whole drive and let the connector's content-tag
   *    comparison turn changes to *other* files into cheap no-ops (the refresh
   *    re-reads the deck's cTag, sees it unchanged, and reuses the render).
   *  - `resource` (an explicit Graph resource, e.g. an Outlook calendar's event
   *    collection): used verbatim with the given `changeType`.
   *
   * No-op when webhooks aren't configured (falls back to polling).
   */
  async ensureSubscription(params: {
    connectionId: string;
    organizationId: string;
    /**
     * The drive the item lives in. Present for OneDrive-for-Business and
     * SharePoint files (which are not in the caller's own `/me/drive`); when
     * omitted (and no explicit `resource`) we fall back to the connected user's
     * default drive.
     */
    driveId?: string;
    /**
     * An explicit Graph resource path to subscribe to, overriding the drive-root
     * default — e.g. `/me/calendars/{id}/events`. Pair with `changeType`.
     */
    resource?: string;
    /** Change types to watch. Defaults to `'updated'` (drive-root items). */
    changeType?: string;
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
    // An explicit resource wins; otherwise the drive ROOT — the only shape Graph
    // accepts for driveItem subscriptions (item-level ones are rejected 400).
    const resource =
      params.resource ??
      (params.driveId ? `/drives/${params.driveId}/root` : `/me/drive/root`);
    const changeType = params.changeType ?? 'updated';
    const expiresAt = new Date(Date.now() + SUBSCRIPTION_TTL_MS);

    const response = await fetch(GRAPH_SUBSCRIPTIONS_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${connection.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        changeType,
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

  /**
   * Delete subscriptions nothing references any more.
   *
   * A subscription is created per cache key on config save and was, until this
   * existed, never deleted by anything: not by removing the instance, not by an
   * edit that changes the cache key (a new mapping or workbook mints a new
   * subscription and abandons the old one), not by uninstalling the app, not by
   * disconnecting the account. {@link renewExpiring} then renewed every
   * abandoned row hourly, forever — and once the connection was gone, failed to
   * renew it hourly, forever.
   *
   * Swept rather than deleted at each of those call sites on purpose: a cache
   * key is SHARED by every instance that resolves to it, so "this instance is
   * gone" does not imply "this subscription is unused". Comparing the whole
   * table against the live key set is the only check that gets that right, and
   * it cannot be defeated by a new deletion path someone forgets to hook up.
   */
  async pruneOrphaned(): Promise<number> {
    const stored = await this.subscriptionsRepository.findAll();
    if (stored.length === 0) {
      return 0;
    }
    const live = await this.appDataService.liveCacheKeys();

    let removed = 0;
    for (const sub of stored) {
      if (live.has(sub.cacheKey)) {
        continue;
      }
      await this.deleteSubscription(sub);
      removed += 1;
    }
    if (removed > 0) {
      this.logger.log(`Pruned ${String(removed)} orphaned Graph subscriptions`);
    }
    return removed;
  }

  /**
   * Tell Graph to stop sending, then forget the row. The remote DELETE is
   * best-effort — a subscription we can no longer authenticate for (the account
   * was disconnected) still has to leave our table, or the sweep retries it
   * every hour for the lifetime of the deployment.
   */
  private async deleteSubscription(
    sub: GraphSubscriptionDocument,
  ): Promise<void> {
    try {
      const connection = await this.connectionsService.resolveConnection(
        sub.connectionId.toString(),
      );
      await fetch(`${GRAPH_SUBSCRIPTIONS_URL}/${sub.subscriptionId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${connection.accessToken}` },
      });
    } catch (error) {
      this.logger.debug(
        `Graph subscription delete skipped for ${sub.subscriptionId}: ${String(error)}`,
      );
    }
    await this.subscriptionsRepository.deleteBySubscriptionId(
      sub.subscriptionId,
    );
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
        // A disconnected account leaves the instance (and so its cache key)
        // alive, so the orphan sweep will never claim this row — but it can
        // never be renewed again either. Distinguish "gone for good" from a
        // transient resolve failure and drop only the former.
        if (
          !(await this.connectionsService.connectionExists(
            sub.connectionId.toString(),
          ))
        ) {
          await this.subscriptionsRepository.deleteBySubscriptionId(
            sub.subscriptionId,
          );
          continue;
        }
        this.logger.warn(
          `Subscription renewal failed for ${sub.subscriptionId}: ${String(error)}`,
        );
      }
    }
    return renewed;
  }

  private notificationUrl(): string {
    const base = this.callbackBaseUrl();
    if (!base) {
      throw new Error('Graph webhooks are not configured');
    }
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
