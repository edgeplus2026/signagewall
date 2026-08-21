import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { SchedulerLockService } from './scheduler-lock.service';

function configWith(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

/** Nothing is listening here. */
const UNREACHABLE = { 'redis.host': '127.0.0.1', 'redis.port': 6399 };

describe('SchedulerLockService', () => {
  let service: SchedulerLockService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await service?.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('makes every caller the leader when no Redis is configured', async () => {
    service = new SchedulerLockService(configWith({}));
    service.onModuleInit();

    await expect(service.isLeader('a-job', 60_000)).resolves.toBe(true);
  });

  it('runs the job anyway when Redis is unreachable, without hanging', async () => {
    // The failure direction has to be "the work still happens". With commands
    // parked in ioredis's offline queue this call never settles at all, and the
    // scheduler tick awaiting it stalls for the whole outage instead.
    service = new SchedulerLockService(configWith(UNREACHABLE));
    service.onModuleInit();

    await expect(service.isLeader('a-job', 60_000)).resolves.toBe(true);
  }, 5_000);

  it('shuts down promptly while Redis is unreachable', async () => {
    // SIGTERM used to wait on a `quit()` that could never be delivered, so the
    // instance held its port until the platform killed it.
    service = new SchedulerLockService(configWith(UNREACHABLE));
    service.onModuleInit();
    await service.isLeader('a-job', 60_000);

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  }, 5_000);
});
