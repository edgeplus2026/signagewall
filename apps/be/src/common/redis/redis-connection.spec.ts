import type { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import {
  buildQueueRedisOptions,
  buildRedisOptions,
  closeQuietly,
} from './redis-connection';

/** Minimal stand-in: these helpers only ever read `redis.*`. */
function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('buildRedisOptions', () => {
  it('returns null when nothing is configured, so the caller can degrade', () => {
    expect(buildRedisOptions(configWith({}))).toBeNull();
    expect(buildRedisOptions(configWith({ 'redis.host': '  ' }))).toBeNull();
  });

  it('prefers REDIS_URL over the discrete host settings', () => {
    const options = buildRedisOptions(
      configWith({
        'redis.url': 'redis://default:secret@redis.railway.internal:6379',
        'redis.host': 'ignored.example',
        'redis.port': 1234,
      }),
    );

    expect(options).toMatchObject({
      host: 'redis.railway.internal',
      port: 6379,
      username: 'default',
      password: 'secret',
    });
  });

  it('percent-decodes both halves of the credentials', () => {
    // A generated password may contain `@`, `/` or `#`, which only survives the
    // URL as an escape; sending it on verbatim fails authentication.
    const options = buildRedisOptions(
      configWith({
        'redis.url': 'redis://us%40er:p%40ss%2Fword@host:6379',
      }),
    );

    expect(options).toMatchObject({
      username: 'us@er',
      password: 'p@ss/word',
    });
  });

  it('enables TLS for rediss:// only', () => {
    expect(
      buildRedisOptions(configWith({ 'redis.url': 'rediss://host:6379' })),
    ).toHaveProperty('tls', {});
    expect(
      buildRedisOptions(configWith({ 'redis.url': 'redis://host:6379' })),
    ).not.toHaveProperty('tls');
  });

  it('asks DNS for any address family in BOTH forms', () => {
    // Railway's private hostnames have published AAAA-only answers, and ioredis
    // defaults to IPv4. This used to reach the URL form only, so a host/port
    // deployment on the same network failed with ENOTFOUND.
    expect(
      buildRedisOptions(configWith({ 'redis.url': 'redis://host:6379' })),
    ).toHaveProperty('family', 0);
    expect(
      buildRedisOptions(configWith({ 'redis.host': 'redis.railway.internal' })),
    ).toHaveProperty('family', 0);
  });

  it('throws on a malformed REDIS_URL rather than silently running without Redis', () => {
    // `new URL()` accepts a bare host:port — it reads `redis.railway.internal:`
    // as the scheme — so the scheme check, not the parse, is what catches this.
    expect(() =>
      buildRedisOptions(
        configWith({ 'redis.url': 'redis.railway.internal:6379' }),
      ),
    ).toThrow(/must be a redis:\/\/ or rediss:\/\/ URL/);
    expect(() =>
      buildRedisOptions(configWith({ 'redis.url': 'https://host:6379' })),
    ).toThrow(/must be a redis:\/\/ or rediss:\/\/ URL/);
    expect(() =>
      buildRedisOptions(configWith({ 'redis.url': 'redis://' })),
    ).toThrow(/must be a redis:\/\/ or rediss:\/\/ URL/);
  });

  it('never echoes the URL, which carries the password', () => {
    expect(() =>
      buildRedisOptions(configWith({ 'redis.url': 'not a url: hunter2' })),
    ).not.toThrow(/hunter2/);
  });

  it('falls back to loopback for the queue, which cannot be built without one', () => {
    expect(buildQueueRedisOptions(configWith({}))).toMatchObject({
      host: '127.0.0.1',
      port: 6379,
    });
    expect(
      buildQueueRedisOptions(configWith({ 'redis.url': 'redis://host:6380' })),
    ).toMatchObject({ host: 'host', port: 6380 });
  });
});

describe('closeQuietly', () => {
  it('returns immediately for a client that never connected', async () => {
    // `quit()` on a client that is not ready is queued rather than answered, so
    // awaiting it would block shutdown indefinitely.
    const client = new Redis({
      host: '127.0.0.1',
      port: 6399,
      lazyConnect: true,
    });

    await expect(closeQuietly(client)).resolves.toBeUndefined();
    expect(client.status).toBe('end');
  }, 5_000);
});
