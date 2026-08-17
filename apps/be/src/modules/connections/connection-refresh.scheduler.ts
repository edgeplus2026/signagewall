import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { SchedulerLockService } from '../../common/redis/scheduler-lock.service';
import { ConnectionsService } from './connections.service';

/**
 * Proactively refreshes OAuth connections before they expire, so an idle
 * connection's session never lapses — the always-live-sync apps (Google Sheets,
 * Outlook, Teams, Facebook, Instagram) must stay connected, and Meta tokens
 * (which have no refresh token and are re-extended in-place) must be renewed
 * before their ~60-day window closes even when the instance is briefly unused.
 *
 * Thin: all logic lives in {@link ConnectionsService.refreshExpiring}, which
 * only touches connections nearing expiry and skips actively-used ones. No-op
 * when there are no connections to renew.
 */
@Injectable()
export class ConnectionRefreshScheduler {
  private readonly logger = new Logger(ConnectionRefreshScheduler.name);
  private running = false;

  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly lock: SchedulerLockService,
  ) {}

  @Interval('connection-token-refresh', 6 * 60 * 60 * 1000)
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    // One instance per deployment runs this; see SchedulerLockService.
    if (!(await this.lock.isLeader('connection-token-refresh', 10 * 60_000))) {
      return;
    }
    this.running = true;
    try {
      await this.connectionsService.refreshExpiring();
    } catch (error) {
      this.logger.error('Connection token refresh cycle failed', error);
    } finally {
      this.running = false;
    }
  }
}
