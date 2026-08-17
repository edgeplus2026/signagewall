export const PRIVATE_APP_ASSET_CACHE_NAME = 'signagewall-private-app-assets'

/**
 * Workbox cache identity for a private object. The signed query is temporary;
 * the versioned object path is immutable and is therefore the cache key.
 */
export function privateAppAssetCacheKey(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      return null
    }
    if (!parsed.pathname.includes('/private-assets/v1/')) {
      return null
    }
    parsed.search = ''
    parsed.hash = ''
    return parsed.href
  } catch {
    return null
  }
}

/** Build a closure-free Workbox route pattern for the configured private path. */
export function privateAppAssetUrlPattern(
  origin: string,
  pathPrefix: string,
): RegExp {
  const parsedOrigin = new URL(origin)
  if (parsedOrigin.protocol !== 'https:') {
    throw new Error('Private asset origin must use HTTPS')
  }
  const normalizedPrefix = `/${pathPrefix}`
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '')
  if (normalizedPrefix === '/' || normalizedPrefix.includes('..')) {
    throw new Error('Private asset path prefix is invalid')
  }
  return new RegExp(
    `^${escapeRegExp(parsedOrigin.origin)}${escapeRegExp(normalizedPrefix)}/`,
  )
}

/**
 * Passed as a Workbox strategy plugin by `vite.config.ts`. Its callback is
 * intentionally self-contained because GenerateSW serializes it into the
 * generated service worker.
 */
export const privateAppAssetCacheKeyPlugin = {
  cacheKeyWillBeUsed: async ({
    request,
  }: {
    request: Request
  }): Promise<string> => {
    const parsed = new URL(request.url)
    parsed.search = ''
    parsed.hash = ''
    return parsed.href
  },
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
