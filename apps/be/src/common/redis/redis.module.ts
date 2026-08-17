import { Global, Module } from '@nestjs/common';

import { SchedulerLockService } from './scheduler-lock.service';

/**
 * Cross-cutting Redis coordination. Global because the lock is asked for by
 * whichever module happens to own a periodic job, and threading an import
 * through each of them adds nothing.
 */
@Global()
@Module({
  providers: [SchedulerLockService],
  exports: [SchedulerLockService],
})
export class RedisModule {}
