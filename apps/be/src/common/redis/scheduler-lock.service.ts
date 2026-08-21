import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

import {
  buildRedisOptions,
  closeQuietly,
  logConnectionState,
} from './redis-connection';

/**
 * Decides whether THIS instance is the one that runs a periodic job.
 *
 * Every `@Interval` in the app runs in every process. With one instance that is
 * exactly right; with several it means the connector refresh cycle fires N times
 * a minute, N processes fetch the same upstream feeds, and N of them race to
 * write the same cache document. The upstream sees a fleet-sized burst for work
 * that was supposed to be shared.
 *
 * The lock is deliberately simple: `SET key owner NX PX ttl`, renewed while held.
 * It is not a consensus algorithm and does not pretend to be — a clock jump or a
 * network partition can, in principle, let two instances believe they hold it.
 * That is acceptable here precisely because the jobs it guards are already
 * idempotent: a doubled refresh cycle costs one redundant fetch, not a corrupted
 * state. Anything that could not survive being run twice does not belong behind
 * this.
 *
 * With no Redis configured every caller is the leader, which is the right answer
 * for the single process that must then be doing the work.
 */
@Injectable()
export class SchedulerLockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerLockService.name);
  private client: Redis | null = null;
  /** Identifies this process, so only the holder can renew or release. */
  private readonly owner = randomUUID();
  /** Keys this instance currently holds, with their renewal timers. */
  private readonly held = new Map<string, NodeJS.Timeout>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const options = buildRedisOptions(this.config);
    if (!options) {
      this.logger.log(
        'No Redis configured — scheduled jobs run unconditionally (single instance).',
      );
      return;
    }
    this.client = new Redis({
      ...options,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      // Fail commands immediately while the connection is down instead of
      // parking them in the offline queue. Queued is the wrong answer here:
      // `isLeader` would never settle, so the scheduler tick awaiting it would
      // stall for the whole outage — the opposite of the fail-open behaviour
      // this class promises. The Socket.IO adapter wants the opposite and keeps
      // the queue, because its SUBSCRIBE has to survive until Redis is back.
      enableOfflineQueue: false,
    });
    logConnectionState(this.client, this.logger, 'Scheduler lease');
    // ioredis retries on its own; the rejection of the first attempt is already
    // reported by the error listener above.
    void this.client.connect().catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.held.values()) {
      clearInterval(timer);
    }
    // Release rather than wait out the TTL, so a rolling deploy hands the work
    // over in seconds instead of leaving nobody refreshing for a lease period.
    // Only worth attempting while the connection is actually up — otherwise the
    // TTL is the handover, and shutdown should not wait on a dead Redis.
    await Promise.all([...this.held.keys()].map((key) => this.release(key)));
    this.held.clear();
    if (this.client) {
      await closeQuietly(this.client);
      this.client = null;
    }
  }

  /**
   * Whether this instance may run `job` right now.
   *
   * Acquires on first success and then RENEWS for as long as the process lives,
   * so leadership is sticky: the job keeps running where it started rather than
   * hopping between instances every tick, which would defeat any in-memory state
   * a job builds up.
   */
  async isLeader(job: string, ttlMs: number): Promise<boolean> {
    if (!this.client) {
      return true;
    }
    const key = `signagewall:lock:${job}`;
    if (this.held.has(key)) {
      return true;
    }
    try {
      const acquired = await this.client.set(
        key,
        this.owner,
        'PX',
        ttlMs,
        'NX',
      );
      if (acquired !== 'OK') {
        return false;
      }
      // Renew at a third of the lease: two renewals may be lost to a blip before
      // another instance can take over.
      const timer = setInterval(
        () => {
          void this.renew(key, ttlMs);
        },
        Math.max(1_000, Math.floor(ttlMs / 3)),
      );
      timer.unref();
      this.held.set(key, timer);
      this.logger.log(`Took the scheduler lease for '${job}'`);
      return true;
    } catch (error) {
      // Redis unreachable. Run the job: a missed refresh cycle is a screen with
      // stale data, while a duplicated one costs one extra upstream fetch. The
      // failure direction has to be "the work still happens".
      this.logger.warn(
        `Scheduler lock unavailable for '${job}', running anyway: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return true;
    }
  }

  /** Extends the lease, but only while this process is still the owner. */
  private async renew(key: string, ttlMs: number): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      const extended = await this.client.eval(
        `if redis.call('get', KEYS[1]) == ARGV[1] then
           return redis.call('pexpire', KEYS[1], ARGV[2])
         else
           return 0
         end`,
        1,
        key,
        this.owner,
        String(ttlMs),
      );
      if (extended !== 1) {
        // Lost it — a long stall let the lease expire and somebody else took
        // over. Stop claiming leadership rather than running alongside them.
        const timer = this.held.get(key);
        if (timer) {
          clearInterval(timer);
        }
        this.held.delete(key);
        this.logger.warn(`Lost the scheduler lease for '${key}'`);
      }
    } catch {
      // Leave the lease alone; the next renewal retries and the TTL protects us.
    }
  }

  private async release(key: string): Promise<void> {
    if (this.client?.status !== 'ready') {
      return;
    }
    try {
      await this.client.eval(
        `if redis.call('get', KEYS[1]) == ARGV[1] then
           return redis.call('del', KEYS[1])
         else
           return 0
         end`,
        1,
        key,
        this.owner,
      );
    } catch {
      // The TTL will clear it.
    }
  }
}
