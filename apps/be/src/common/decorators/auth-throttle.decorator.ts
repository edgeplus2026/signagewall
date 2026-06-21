import { Throttle } from '@nestjs/throttler';

/**
 * Stricter rate limit for sensitive, abuse-prone public endpoints
 * (login, register, password reset, token refresh, invite preview).
 * Guards against brute-force and token/email enumeration.
 *
 * Defaults mirror `THROTTLE_AUTH_LIMIT` / `THROTTLE_AUTH_TTL_SECONDS`
 * (10 requests per 60s). Decorator metadata must be static, so these are
 * fixed here rather than read from config at runtime.
 */
export const AUTH_THROTTLE_LIMIT = 10;
export const AUTH_THROTTLE_TTL_MS = 60_000;

export const AuthThrottle = () =>
  Throttle({
    default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS },
  });
