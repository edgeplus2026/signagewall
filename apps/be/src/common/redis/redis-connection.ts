import type { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Redis, RedisOptions } from 'ioredis';

/**
 * The single place that turns configuration into an ioredis connection.
 *
 * Everything that talks to Redis comes through here — the Socket.IO adapter, the
 * scheduler lease and the BullMQ queue — because when the queue and the adapter
 * each parsed the config for themselves they drifted: one percent-decoded the
 * username and the other did not, one threw on a malformed URL while the other
 * silently reported "no Redis", and `family: 0` reached only the URL form, so a
 * `REDIS_HOST=redis.railway.internal` deployment failed with ENOTFOUND.
 *
 * Redis is optional by design, and everything built on it degrades rather than
 * fails: without it the socket gateway keeps its in-memory adapter (correct for
 * a single instance, wrong for several) and the schedulers stop electing a
 * leader (correct for one process, duplicated work for several). A developer's
 * laptop should not need one; a multi-instance deployment must have one, and the
 * boot log says which of the two this is.
 */

/** Loopback fallback for the one caller that cannot run without a connection. */
const LOCAL_FALLBACK: RedisOptions = { host: '127.0.0.1', port: 6379 };

/**
 * `family: 0` lets ioredis use whichever of the A/AAAA answers DNS returns.
 * Railway's `*.railway.internal` names have at times published AAAA only, while
 * Node's default lookup prefers IPv4 and fails there with ENOTFOUND. Verified
 * harmless for plain IPv4 hosts, `localhost` included.
 */
const DNS_ANY_FAMILY = 0;

/**
 * None of these errors echo any part of the value. `new URL()` accepts a bare
 * `host:6379` — it reads `host:` as the scheme — so whatever was written would
 * otherwise reach the log, and this variable carries the password.
 */
function optionsFromUrl(url: string): RedisOptions {
  const malformed = new Error(
    'REDIS_URL must be a redis:// or rediss:// URL ' +
      '(e.g. rediss://default:password@host:6379).',
  );

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw malformed;
  }

  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw malformed;
  }

  if (!parsed.hostname) {
    throw malformed;
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    ...(parsed.username
      ? { username: decodeURIComponent(parsed.username) }
      : {}),
    ...(parsed.password
      ? { password: decodeURIComponent(parsed.password) }
      : {}),
    family: DNS_ANY_FAMILY,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

/**
 * The connection this deployment should use, or `null` when no Redis is
 * configured at all.
 *
 * A malformed `REDIS_URL` throws instead of returning `null`: an operator who
 * set the variable meant to have Redis, and silently starting up without it
 * would leave a multi-instance deployment quietly broken.
 */
export function buildRedisOptions(config: ConfigService): RedisOptions | null {
  const url = config.get<string>('redis.url')?.trim();
  if (url) {
    return optionsFromUrl(url);
  }

  const host = config.get<string>('redis.host')?.trim();
  if (!host) {
    return null;
  }

  const password = config.get<string>('redis.password')?.trim();
  return {
    host,
    port: config.get<number>('redis.port') ?? 6379,
    family: DNS_ANY_FAMILY,
    ...(password ? { password } : {}),
    ...(config.get<boolean>('redis.tls') ? { tls: {} } : {}),
  };
}

/**
 * Same connection, but for BullMQ, which has no "no Redis" mode — a queue
 * without a backing store cannot be constructed at all. With nothing configured
 * it points at loopback, which is the local `docker compose up -d redis` and, in
 * a deployment that forgot `REDIS_URL`, a connection error repeated in the log
 * rather than a queue that quietly accepts jobs nobody will ever run.
 */
export function buildQueueRedisOptions(config: ConfigService): RedisOptions {
  return buildRedisOptions(config) ?? LOCAL_FALLBACK;
}

/**
 * Attaches the connection logging every Redis client here wants.
 *
 * ioredis retries roughly once a second and emits an `error` each time, so an
 * outage that the API is now designed to survive would otherwise write tens of
 * thousands of identical lines — measured at ~3.4 lines/second across the three
 * clients. Only the first failure is reported, and nothing more until the
 * connection comes back, which is reported too. A listener is attached in every
 * case regardless: an `error` event with no listener is fatal to the process.
 */
export function logConnectionState(
  client: Redis,
  logger: Logger,
  what: string,
): void {
  let reportedSinceReady = false;

  client.on('error', (error: Error) => {
    if (reportedSinceReady) {
      return;
    }
    reportedSinceReady = true;
    logger.error(`${what} unavailable: ${error.message} — retrying quietly`);
  });

  client.on('ready', () => {
    logger.log(reportedSinceReady ? `${what} back up` : `${what} connected`);
    reportedSinceReady = false;
  });
}

/**
 * Closes a client without letting shutdown hang.
 *
 * `quit()` is an ordinary command, so on a client that is mid-reconnect it goes
 * into ioredis's offline queue and never settles — neither resolving nor
 * rejecting. A SIGTERM arriving during a Redis outage would then wait for the
 * platform to SIGKILL the process instead of exiting, which on a rolling deploy
 * means the old instance holds its port for the whole grace period.
 */
export async function closeQuietly(
  client: Redis,
  timeoutMs = 2_000,
): Promise<void> {
  if (client.status !== 'ready') {
    client.disconnect();
    return;
  }

  await Promise.race([
    client.quit().then(
      () => undefined,
      () => undefined,
    ),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs).unref();
    }),
  ]);
  client.disconnect();
}
