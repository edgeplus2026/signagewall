import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { RedisIoAdapter } from './redis-io.adapter';

function configWith(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('RedisIoAdapter', () => {
  let adapter: RedisIoAdapter | undefined;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await adapter?.dispose();
    adapter = undefined;
    jest.restoreAllMocks();
  });

  it('reports that there is nothing to connect to when Redis is unconfigured', () => {
    adapter = new RedisIoAdapter({} as never, configWith({}));

    // False, not a throw: the caller logs the legitimate single-instance case
    // and keeps the in-memory adapter.
    expect(adapter.connect()).toBe(false);
  });

  it('wires up without waiting for a Redis that is not answering', () => {
    // The regression this guards: `connect()` used to await the ioredis
    // handshake, which REJECTS on a refused connection. Bootstrap did not catch
    // it, so an unreachable Redis killed the whole API before it ever listened
    // — an outage of the AI queue turned into an outage of everything.
    adapter = new RedisIoAdapter(
      {} as never,
      configWith({ 'redis.host': '127.0.0.1', 'redis.port': 6399 }),
    );

    expect(adapter.connect()).toBe(true);
  });

  it('leaves no clients behind after dispose', async () => {
    adapter = new RedisIoAdapter(
      {} as never,
      configWith({ 'redis.host': '127.0.0.1', 'redis.port': 6399 }),
    );
    adapter.connect();

    await expect(adapter.dispose()).resolves.toBeUndefined();
  });
});
