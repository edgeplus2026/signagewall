import type { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

/**
 * Resolve an ioredis connection from config. `REDIS_URL` wins over host/port,
 * matching the BullMQ wiring in `ai-content.module.ts` — the two must agree, or
 * a deployment that configured one way would silently get the other's defaults.
 *
 * `family: 0` lets ioredis use whichever of A/AAAA DNS answers, because Railway's
 * `*.railway.internal` addresses are IPv6-only and the Node default prefers IPv4.
 */
export function buildRedisOptions(config: ConfigService): RedisOptions | null {
  const url = config.get<string>('redis.url')?.trim();

  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      ...(parsed.username ? { username: parsed.username } : {}),
      ...(parsed.password
        ? { password: decodeURIComponent(parsed.password) }
        : {}),
      family: 0,
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }

  const host = config.get<string>('redis.host')?.trim();
  if (!host) {
    return null;
  }
  const password = config.get<string>('redis.password')?.trim();
  return {
    host,
    port: config.get<number>('redis.port') ?? 6379,
    ...(password ? { password } : {}),
    ...(config.get<boolean>('redis.tls') ? { tls: {} } : {}),
  };
}

/**
 * Whether this deployment has a Redis to coordinate through.
 *
 * The distinction matters because everything built on it degrades rather than
 * fails: without Redis the socket gateway keeps its in-memory adapter (correct
 * for a single instance, wrong for several) and the schedulers stop trying to
 * elect a leader (correct for one process, duplicated work for several). A
 * developer's laptop has no Redis and should not need one; a multi-instance
 * deployment must have one, and says so at startup.
 */
export function hasRedis(config: ConfigService): boolean {
  return buildRedisOptions(config) !== null;
}
