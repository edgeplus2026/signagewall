import { describe, expect, it } from 'vitest'

import {
  privateAppAssetCacheKey,
  privateAppAssetCacheKeyPlugin,
  privateAppAssetUrlPattern,
} from './private-app-asset-cache-key'
import { collectPrivateAppAssetUrls } from './private-app-assets'

function asset(version: string, page: number, renewal: number) {
  const key = `private-assets/v1/organizations/org/instances/app/connections/connection/versions/${version}/page-${page}.png`
  const url = new URL(`/${key}`, 'https://private.invalid')
  url.searchParams.set('renewal', String(renewal))
  return {
    kind: 'private-asset' as const,
    key,
    version,
    mimeType: 'image/png',
    url: url.href,
  }
}

describe('private app asset collection and cache identity', () => {
  it('recursively collects all pages and ignores unhydrated refs', () => {
    const first = asset('revision-1', 1, 1)
    const second = asset('revision-1', 2, 1)
    const payload = {
      report: {
        sections: [{ pages: [first] }, { pages: [{ nested: second }] }],
      },
      pending: {
        kind: 'private-asset',
        key: second.key,
        version: second.version,
        mimeType: second.mimeType,
      },
    }

    expect(collectPrivateAppAssetUrls(payload)).toEqual([first.url, second.url])
  })

  it('deduplicates renewed signatures by immutable versioned path', () => {
    const first = asset('revision-1', 1, 1)
    const renewed = asset('revision-1', 1, 2)

    expect(collectPrivateAppAssetUrls([first, renewed])).toEqual([first.url])
    expect(privateAppAssetCacheKey(first.url)).toBe(
      privateAppAssetCacheKey(renewed.url),
    )
  })

  it('uses a new cache identity for a new asset version', () => {
    const first = asset('revision-1', 1, 1)
    const next = asset('revision-2', 1, 1)

    expect(privateAppAssetCacheKey(first.url)).not.toBe(
      privateAppAssetCacheKey(next.url),
    )
  })

  it('keeps prefetched bytes addressable after the original URL expires', () => {
    const pages = [asset('revision-1', 1, 1), asset('revision-1', 2, 1)]
    const cache = new Map(
      pages.map((page) => [privateAppAssetCacheKey(page.url), page.key]),
    )
    const renewedAfterExpiry = pages.map((page, index) =>
      asset(page.version, index + 1, 2),
    )

    expect(
      renewedAfterExpiry.map((page) =>
        cache.get(privateAppAssetCacheKey(page.url)),
      ),
    ).toEqual(pages.map((page) => page.key))
  })

  it('provides a self-contained Workbox queryless cache-key plugin', async () => {
    const page = asset('revision-1', 1, 1)
    const cacheKey = await privateAppAssetCacheKeyPlugin.cacheKeyWillBeUsed({
      request: new Request(page.url),
    })

    expect(cacheKey).toBe(privateAppAssetCacheKey(page.url))
    expect(cacheKey).not.toContain('?')
  })

  it('builds a route restricted to the configured private host and bucket path', () => {
    const pattern = privateAppAssetUrlPattern(
      'https://private.invalid',
      '/private-bucket/private-assets/v1',
    )

    expect(
      pattern.test(
        'https://private.invalid/private-bucket/private-assets/v1/organizations/org/page.png',
      ),
    ).toBe(true)
    expect(
      pattern.test(
        'https://public.invalid/private-bucket/private-assets/v1/organizations/org/page.png',
      ),
    ).toBe(false)
    expect(pattern.test('https://private.invalid/public-bucket/page.png')).toBe(
      false,
    )
  })
})
