import {
  isHydratedPrivateAssetRef,
  type HydratedPrivateAssetRef,
} from '@signagewall/apps-contract'

import { privateAppAssetCacheKey } from './private-app-asset-cache-key'

/**
 * Recursively collect every hydrated private app asset in a snapshot/payload.
 * Results are deduplicated by immutable object path, not rotating signature.
 */
export function collectPrivateAppAssetUrls(payload: unknown): string[] {
  const byCacheKey = new Map<string, HydratedPrivateAssetRef>()
  const visited = new WeakSet<object>()

  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') {
      return
    }
    if (isHydratedPrivateAssetRef(value)) {
      const cacheKey = privateAppAssetCacheKey(value.url)
      if (cacheKey && !byCacheKey.has(cacheKey)) {
        byCacheKey.set(cacheKey, value)
      }
      return
    }
    if (visited.has(value)) {
      return
    }
    visited.add(value)
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    Object.values(value).forEach(visit)
  }

  visit(payload)
  return [...byCacheKey.values()].map((ref) => ref.url)
}
