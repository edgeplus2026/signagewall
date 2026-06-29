import type { AppInstanceDocument } from '../schemas/app-instance.schema';
import { getConnector } from './connector-registry';

/** An app instance paired with the cache key its config resolves to. */
export interface InstanceCacheKey {
  instance: AppInstanceDocument;
  cacheKey: string;
}

/**
 * Compute the connector cache key for a single instance, or null when the slug
 * has no connector (static app) or the connector defines no `cacheKey`.
 * Swallows connector errors (e.g. malformed config) by returning null so one
 * bad instance never breaks scheduling/fan-out for the rest.
 */
export function cacheKeyForInstance(
  instance: AppInstanceDocument,
): string | null {
  const connector = getConnector(instance.appSlug);
  if (!connector?.cacheKey) {
    return null;
  }
  try {
    return connector.cacheKey(instance.config);
  } catch {
    return null;
  }
}

/** Pair each instance with its cache key, dropping those without one. */
export function withCacheKeys(
  instances: AppInstanceDocument[],
): InstanceCacheKey[] {
  const paired: InstanceCacheKey[] = [];
  for (const instance of instances) {
    const cacheKey = cacheKeyForInstance(instance);
    if (cacheKey) {
      paired.push({ instance, cacheKey });
    }
  }
  return paired;
}
