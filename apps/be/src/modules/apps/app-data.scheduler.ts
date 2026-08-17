import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { SchedulerLockService } from '../../common/redis/scheduler-lock.service';
import { AppDataService } from './app-data.service';

/**
 * Lease length for the refresh cycle. Comfortably longer than the tick so the
 * holder never loses it between runs, short enough that a crashed instance's work
 * is picked up within a couple of minutes rather than stopping the fleet's data.
 */
const REFRESH_LEASE_MS = 5 * 60_000;

/**
 * Drives the connector refresh cycle on a fixed tick. Each tick the service
 * picks the cache keys that are due (per the app's `refreshSeconds`) and fetches
 * them once each — so the upstream load is bounded by the number of distinct
 * cache keys, not the number of players. Thin by design: all logic lives in
 * {@link AppDataService} so it stays unit-testable without timers.
 */
@Injectable()
export class AppDataScheduler implements OnModuleInit {
  private readonly logger = new Logger(AppDataScheduler.name);
  private running = false;
  /** Cleared once the one-time cacheKey backfill has completed. */
  private backfillPending = true;

  constructor(
    private readonly appDataService: AppDataService,
    private readonly lock: SchedulerLockService,
  ) {}

  /**
   * Repairs pre-existing instances before the first refresh cycle selects on the
   * denormalized `cacheKey`. Failure leaves the flag set so the next tick retries
   * — an un-backfilled instance is invisible to the scheduler, so giving up here
   * would strand it silently.
   */
  async onModuleInit(): Promise<void> {
    await this.runBackfill();
  }

  private async runBackfill(): Promise<void> {
    if (!this.backfillPending) {
      return;
    }
    try {
      await this.appDataService.backfillCacheKeys();
      this.backfillPending = false;
    } catch (error) {
      this.logger.error('App data cacheKey backfill failed', error);
    }
  }

  @Interval('app-data-refresh', 60_000)
  async tick(): Promise<void> {
    // Guard against overlapping runs if a cycle outlasts the interval.
    if (this.running) {
      return;
    }
    // One instance refreshes for the whole deployment. Without this every
    // replica fetches every due feed, so the upstream sees N times the traffic
    // and N writers race for the same cache document — for work that produces
    // one identical result.
    if (!(await this.lock.isLeader('app-data-refresh', REFRESH_LEASE_MS))) {
      return;
    }
    await this.runBackfill();

    this.running = true;
    try {
      await this.appDataService.refreshDue();
    } catch (error) {
      this.logger.error('App data refresh cycle failed', error);
    } finally {
      this.running = false;
    }
  }

  /**
   * Sweep orphaned connector cache entries once a day. Deleting a reconfigured
   * or deleted instance's key is not urgent — it just must happen, or the cache
   * collection grows for the lifetime of the deployment. Failures are logged and
   * dropped: a missed sweep costs nothing the next one won't collect.
   */
  @Interval('app-data-cache-prune', 24 * 60 * 60_000)
  async prune(): Promise<void> {
    if (!(await this.lock.isLeader('app-data-prune', REFRESH_LEASE_MS))) {
      return;
    }
    try {
      await this.appDataService.pruneStaleCache();
    } catch (error) {
      this.logger.error('App data cache prune failed', error);
    }
  }
}
