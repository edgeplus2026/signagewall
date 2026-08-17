import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { SchedulerLockService } from '../../../common/redis/scheduler-lock.service';
import { GraphWebhookService } from './graph-webhook.service';

/**
 * Keeps the Microsoft Graph subscription table honest, hourly: drop the rows
 * nothing references any more, then renew what is left before it expires (Graph
 * caps subscription lifetime, so a long-lived screen needs periodic renewal).
 * Thin: all logic lives in {@link GraphWebhookService}. No-op when webhooks are
 * not configured.
 *
 * Prune BEFORE renew, so an abandoned subscription is deleted rather than
 * renewed one last time on the tick that collects it.
 */
@Injectable()
export class GraphSubscriptionScheduler {
  private readonly logger = new Logger(GraphSubscriptionScheduler.name);
  private running = false;

  constructor(
    private readonly webhookService: GraphWebhookService,
    private readonly lock: SchedulerLockService,
  ) {}

  @Interval('graph-subscription-renew', 60 * 60 * 1000)
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    // One instance per deployment runs this; see SchedulerLockService.
    if (!(await this.lock.isLeader('graph-subscription-renew', 10 * 60_000))) {
      return;
    }
    this.running = true;
    try {
      await this.webhookService.pruneOrphaned();
    } catch (error) {
      this.logger.error('Graph subscription prune failed', error);
    }
    try {
      await this.webhookService.renewExpiring();
    } catch (error) {
      this.logger.error('Graph subscription renewal failed', error);
    } finally {
      this.running = false;
    }
  }
}
