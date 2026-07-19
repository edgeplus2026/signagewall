import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { GraphWebhookService } from './graph-webhook.service';

/**
 * Renews Microsoft Graph subscriptions before they expire (Graph caps their
 * lifetime, so a long-lived screen needs periodic renewal). Thin: all logic
 * lives in {@link GraphWebhookService.renewExpiring}. No-op when webhooks are
 * not configured.
 */
@Injectable()
export class GraphSubscriptionScheduler {
  private readonly logger = new Logger(GraphSubscriptionScheduler.name);
  private running = false;

  constructor(private readonly webhookService: GraphWebhookService) {}

  @Interval('graph-subscription-renew', 60 * 60 * 1000)
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await this.webhookService.renewExpiring();
    } catch (error) {
      this.logger.error('Graph subscription renewal failed', error);
    } finally {
      this.running = false;
    }
  }
}
