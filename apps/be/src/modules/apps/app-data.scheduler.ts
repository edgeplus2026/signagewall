import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { AppDataService } from './app-data.service';

/**
 * Drives the connector refresh cycle on a fixed tick. Each tick the service
 * picks the cache keys that are due (per the app's `refreshSeconds`) and fetches
 * them once each — so the upstream load is bounded by the number of distinct
 * cache keys, not the number of players. Thin by design: all logic lives in
 * {@link AppDataService} so it stays unit-testable without timers.
 */
@Injectable()
export class AppDataScheduler {
  private readonly logger = new Logger(AppDataScheduler.name);
  private running = false;

  constructor(private readonly appDataService: AppDataService) {}

  @Interval('app-data-refresh', 60_000)
  async tick(): Promise<void> {
    // Guard against overlapping runs if a cycle outlasts the interval.
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      await this.appDataService.refreshDue();
    } catch (error) {
      this.logger.error('App data refresh cycle failed', error);
    } finally {
      this.running = false;
    }
  }
}
