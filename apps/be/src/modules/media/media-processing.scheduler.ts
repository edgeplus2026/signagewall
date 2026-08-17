import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { SchedulerLockService } from '../../common/redis/scheduler-lock.service';
import { MediaService } from './media.service';

/**
 * Periodically reconciles media items stuck in PROCESSING. This is the
 * durability backstop for the out-of-band thumbnail step: if the process that
 * accepted an upload dies before finishing (or hits a transient error), the
 * item is re-driven here instead of being orphaned in PROCESSING forever.
 */
@Injectable()
export class MediaProcessingScheduler {
  private readonly logger = new Logger(MediaProcessingScheduler.name);
  private running = false;

  constructor(
    private readonly mediaService: MediaService,
    private readonly lock: SchedulerLockService,
  ) {}

  @Interval('media-reprocess-stuck', 30_000)
  async sweep(): Promise<void> {
    // Guard against overlapping runs if a sweep takes longer than the interval.
    if (this.running) {
      return;
    }

    // One instance per deployment runs this; see SchedulerLockService.
    if (!(await this.lock.isLeader('media-reprocess-stuck', 5 * 60_000))) {
      return;
    }

    this.running = true;
    try {
      await this.mediaService.reprocessStuckItems();
    } catch (error) {
      this.logger.error('Media reconciliation sweep failed', error);
    } finally {
      this.running = false;
    }
  }
}
