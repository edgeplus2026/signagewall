import { describe, expect, it, vi } from 'vitest'

import { CacheWarmer, type PrefetchDeps } from './prefetch'

// Imported transitively by the module under test only for startPrefetch wiring.
vi.mock('../store', () => ({ snapshot: { value: null } }))

function makeDeps(over: Partial<PrefetchDeps> = {}) {
  const fetched: string[] = []
  const deps: PrefetchDeps = {
    fetch: vi.fn(async (url: string) => {
      fetched.push(url)
    }),
    isCached: vi.fn(async () => false),
    overBudget: vi.fn(async () => false),
    ...over,
  }
  return { deps, fetched }
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

    expect(fetched).toEqual(['a', 'a', 'b'])
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
    warmer.onOnline(['a', 'b'])
    await warmer.settle()
    expect(fetched).toEqual(['a', 'b']) // no extra fetches
    expect(deps.isCached).toHaveBeenCalledTimes(2) // scanned once, not twice
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
