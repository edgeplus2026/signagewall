import { afterEach, describe, expect, it, vi } from 'vitest'

import { CacheWarmer, isOverBudget, type PrefetchDeps } from './prefetch'

// Imported transitively by the module under test only for startPrefetch wiring.
vi.mock('../store', () => ({ snapshot: { value: null } }))

// The shell's free-disk reading. Hoisted so the factory below can reference it:
// `vi.mock` is lifted above the imports, and a plain const would still be in its
// temporal dead zone by the time the factory runs.
const { freeDiskMock } = vi.hoisted(() => ({
  freeDiskMock: vi.fn<() => Promise<number | undefined>>(),
}))
vi.mock('../native/runtime', () => ({ freeDiskBytes: freeDiskMock }))

function makeDeps(over: Partial<PrefetchDeps> = {}) {
  const fetched: string[] = []
  // A fetch that actually fills the cache, so "warmed" can be asserted the way
  // the warmer now defines it: bytes present, not merely a request that returned.
  const cached = new Set<string>()
  const deps: PrefetchDeps = {
    fetch: vi.fn(async (url: string) => {
      fetched.push(url)
      cached.add(url)
    }),
    isCached: vi.fn(async (url: string) => cached.has(url)),
    overBudget: vi.fn(async () => false),
    ready: vi.fn(async () => undefined),
    ...over,
  }
  return { deps, fetched, cached }
}

describe('CacheWarmer', () => {
  it('warms every uncached url on a content change', async () => {
    const { deps, fetched } = makeDeps()
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b', 'c'])
    await warmer.settle()

    expect(fetched).toEqual(['a', 'b', 'c'])
  })

  it('skips urls already in the cache', async () => {
    const { deps, fetched } = makeDeps({
      isCached: vi.fn(async (url: string) => url === 'b'),
    })
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b', 'c'])
    await warmer.settle()

    expect(fetched).toEqual(['a', 'c'])
  })

  it('stops warming once storage is over budget', async () => {
    const { deps, fetched } = makeDeps({
      overBudget: vi.fn(async () => true),
    })
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b'])
    await warmer.settle()

    expect(fetched).toEqual([])
  })

  it('does not re-warm when the media set is unchanged', async () => {
    const { deps, fetched } = makeDeps()
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b'])
    await warmer.settle()
    warmer.onContent(['a', 'b']) // e.g. a data-only refresh: same media
    await warmer.settle()

    expect(fetched).toEqual(['a', 'b'])
  })

  it('re-warms when the media set changes', async () => {
    const { deps, fetched } = makeDeps()
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a'])
    await warmer.settle()
    warmer.onContent(['a', 'b'])
    await warmer.settle()

    // The changed set does start a fresh pass — but 'a' is genuinely cached by
    // now, so it is skipped rather than downloaded a second time.
    expect(fetched).toEqual(['a', 'b'])
  })

  it('retries the current set on reconnect when idle', async () => {
    // Previous pass failed offline (fetch rejects) → items still uncached.
    let online = false
    const { deps, fetched } = makeDeps({
      fetch: vi.fn(async (url: string) => {
        if (!online) {
          throw new Error('offline')
        }
        fetched.push(url)
      }),
    })
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b'])
    await warmer.settle()
    expect(fetched).toEqual([]) // nothing warmed while offline

    online = true
    warmer.onOnline(['a', 'b'])
    await warmer.settle()
    expect(fetched).toEqual(['a', 'b'])
  })

  it('skips the reconnect rescan once the set is fully warmed', async () => {
    const { deps, fetched } = makeDeps()
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b'])
    await warmer.settle()
    expect(fetched).toEqual(['a', 'b'])

    // Everything is warmed; a flapping link's `online` events must not re-scan
    // the whole set (a Cache lookup per URL) again.
    const lookupsAfterFirstPass = vi.mocked(deps.isCached).mock.calls.length
    warmer.onOnline(['a', 'b'])
    await warmer.settle()
    expect(fetched).toEqual(['a', 'b']) // no extra fetches
    expect(deps.isCached).toHaveBeenCalledTimes(lookupsAfterFirstPass) // no rescan
  })

  it('retries on reconnect when a "successful" fetch cached nothing', async () => {
    // The failure mode this guards: fetch() resolves on headers, so a pass can
    // sail through without a byte landing in the cache. Trusting it left the
    // device permanently uncached, because `complete` then blocked every retry.
    const { deps, fetched } = makeDeps({
      fetch: vi.fn(async (url: string) => {
        fetched.push(url) // resolves, but nothing reaches the cache
      }),
    })
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b'])
    await warmer.settle()
    expect(fetched).toEqual(['a', 'b'])

    warmer.onOnline(['a', 'b'])
    await warmer.settle()
    expect(fetched).toEqual(['a', 'b', 'a', 'b']) // retried, not written off
  })

  it('warms only once the service worker controls the page', async () => {
    let claim!: () => void
    const controlled = new Promise<void>((resolve) => {
      claim = resolve
    })
    const { deps, fetched } = makeDeps({ ready: vi.fn(() => controlled) })
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b'])
    await Promise.resolve()
    // Fetching here would bypass an uncontrolled page's worker and cache nothing.
    expect(fetched).toEqual([])

    claim()
    await warmer.settle()
    expect(fetched).toEqual(['a', 'b'])
  })

  it('does not stack a second pass while one is running', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { deps, fetched } = makeDeps({
      fetch: vi.fn(async (url: string) => {
        await gate
        fetched.push(url)
      }),
    })
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b'])
    warmer.onOnline(['a', 'b']) // running → must be a no-op
    release()
    await warmer.settle()

    // Only the first pass ran: two fetches, not four.
    expect(fetched).toEqual(['a', 'b'])
  })

  it('stop() aborts the current pass', async () => {
    const { deps, fetched } = makeDeps({
      isCached: vi.fn(async () => false),
    })
    const warmer = new CacheWarmer(deps)

    warmer.onContent(['a', 'b', 'c'])
    warmer.stop() // aborts before the first await settles
    await warmer.settle()

    expect(fetched).toEqual([])
  })
})

/**
 * The mode matters, not just the bytes: only a CORS response has a body the
 * service worker can slice, and that slicing is what serves a `Range:` request —
 * which every Safari/iOS media load is.
 */
describe('warmMediaUrl', () => {
  /** Fresh module per test: the no-CORS origin memo is module-level state. */
  async function loadWarm() {
    vi.resetModules()
    const module = await import('./prefetch')
    return module.warmMediaUrl
  }

  function stubFetch(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  function modesOf(fetchMock: ReturnType<typeof vi.fn>): string[] {
    return fetchMock.mock.calls.map(
      (call) => (call[1] as RequestInit).mode as string,
    )
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('warms in cors mode so the cached body stays readable', async () => {
    const warmMediaUrl = await loadWarm()
    const fetchMock = stubFetch()
    fetchMock.mockResolvedValue(new Response(''))

    await warmMediaUrl('https://cdn.test/a.mp4', new AbortController().signal)

    expect(modesOf(fetchMock)).toEqual(['cors'])
  })

  it('falls back to no-cors for a host that sends no CORS headers', async () => {
    const warmMediaUrl = await loadWarm()
    const fetchMock = stubFetch()
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response(''))

    await warmMediaUrl('https://cdn.test/a.mp4', new AbortController().signal)

    expect(modesOf(fetchMock)).toEqual(['cors', 'no-cors'])
  })

  // Neither cache keeps an opaque response any more, so there is nothing left to
  // warm from such a host: the download would be paid in full and then refused,
  // again on every content change. Images were still warmed here until the image
  // cache stopped accepting opaque too.
  it('stops warming anything from a host that has no CORS headers', async () => {
    const warmMediaUrl = await loadWarm()
    const fetchMock = stubFetch()
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response(''))
    const signal = new AbortController().signal

    await warmMediaUrl('https://cdn.test/a.mp4', signal)
    fetchMock.mockClear()

    await warmMediaUrl('https://cdn.test/b.jpg', signal)
    await warmMediaUrl('https://cdn.test/clip.mp4?v=2', signal)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  // A URL an element already loaded `no-cors` sits in the HTTP cache with no
  // CORS headers and, since R2 omits `Vary` on those, as the only variant for
  // that URL — so this request would be served it and fail the CORS check
  // without reaching the network. `immutable, max-age=1y` means nothing else
  // ever dislodges it.
  it('bypasses the HTTP cache so a poisoned entry cannot answer', async () => {
    const warmMediaUrl = await loadWarm()
    const fetchMock = stubFetch()
    fetchMock.mockResolvedValue(new Response(''))

    await warmMediaUrl('https://cdn.test/a.mp4', new AbortController().signal)

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: 'reload' })
  })

  it('does not downgrade a host just because we were offline', async () => {
    const warmMediaUrl = await loadWarm()
    const fetchMock = stubFetch()
    // Both modes fail: no network, which says nothing about the host's headers.
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const signal = new AbortController().signal

    await expect(
      warmMediaUrl('https://cdn.test/a.mp4', signal),
    ).rejects.toThrow()
    fetchMock.mockResolvedValue(new Response(''))
    await warmMediaUrl('https://cdn.test/b.mp4', signal)

    // The retry after reconnect still leads with cors.
    expect(modesOf(fetchMock)).toEqual(['cors', 'no-cors', 'cors'])
  })

  it('propagates an aborted pass instead of retrying it', async () => {
    const warmMediaUrl = await loadWarm()
    const fetchMock = stubFetch()
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    const controller = new AbortController()
    controller.abort()

    await expect(
      warmMediaUrl('https://cdn.test/a.mp4', controller.signal),
    ).rejects.toThrow()
    expect(modesOf(fetchMock)).toEqual(['cors'])
  })
})

/**
 * The guard that decides when warming must stop to protect the device. Every case
 * here is one the previous version answered "keep going" to — including the ones
 * where it had just failed to measure anything at all.
 */
describe('isOverBudget', () => {
  const RESERVE = 512 * 1024 * 1024

  function stubEstimate(estimate: (() => Promise<StorageEstimate>) | null): void {
    vi.stubGlobal('navigator', estimate ? { storage: { estimate } } : {})
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    freeDiskMock.mockReset()
  })

  it('stops when the device is below its free-space reserve', async () => {
    freeDiskMock.mockResolvedValue(RESERVE - 1)
    // No storage API stubbed at all: the native answer must be enough on its own.
    stubEstimate(null)
    await expect(isOverBudget()).resolves.toBe(true)
  })

  it('keeps warming while the device has room, and does not consult the quota', async () => {
    freeDiskMock.mockResolvedValue(RESERVE * 4)
    const estimate = vi.fn(async () => ({ usage: 99, quota: 100 }))
    stubEstimate(estimate)
    await expect(isOverBudget()).resolves.toBe(false)
    // The quota would have said "full". Real free space outranks it.
    expect(estimate).not.toHaveBeenCalled()
  })

  describe('off a native shell (no free-disk reading)', () => {
    it('keeps warming where the platform has no estimate at all', async () => {
      // A property of the browser, not a fault: refusing here would cost such a
      // device its offline copy forever, and maxEntries still bounds the cache.
      freeDiskMock.mockResolvedValue(undefined)
      stubEstimate(null)
      await expect(isOverBudget()).resolves.toBe(false)
    })

    it('stops past 90% of the quota', async () => {
      freeDiskMock.mockResolvedValue(undefined)
      stubEstimate(async () => ({ usage: 91, quota: 100 }))
      await expect(isOverBudget()).resolves.toBe(true)
    })

    it('keeps warming on a fresh device that has cached nothing', async () => {
      // usage 0 is a real measurement, not a missing one — the old `!usage` check
      // could not tell the two apart.
      freeDiskMock.mockResolvedValue(undefined)
      stubEstimate(async () => ({ usage: 0, quota: 100 }))
      await expect(isOverBudget()).resolves.toBe(false)
    })

    it('stops when estimate throws', async () => {
      freeDiskMock.mockResolvedValue(undefined)
      stubEstimate(() => Promise.reject(new Error('storage unavailable')))
      await expect(isOverBudget()).resolves.toBe(true)
    })

    it('stops when the quota is unusable', async () => {
      freeDiskMock.mockResolvedValue(undefined)
      stubEstimate(async () => ({ usage: 10, quota: 0 }))
      await expect(isOverBudget()).resolves.toBe(true)
    })
  })
})
