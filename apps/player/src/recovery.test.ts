import { afterEach, describe, expect, it, vi } from 'vitest'

import { getUrlDeviceId, reflectDeviceIdInUrl } from './recovery'

const UUID = '3f2a1b4c-5d6e-7a8b-9c0d-1e2f3a4b5c6d'

/** Stubs a minimal `window` (location + history) for the given URL. */
function stubWindow(href: string, replaceState = vi.fn()) {
  const url = new URL(href)
  vi.stubGlobal('window', {
    location: { href: url.href, search: url.search },
    history: { replaceState },
  })
  return replaceState
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getUrlDeviceId', () => {
  it('returns undefined when ?device= is absent', () => {
    stubWindow('http://localhost:5174/')
    expect(getUrlDeviceId()).toBeUndefined()
  })

  it('returns undefined for a malformed device id (never adopts garbage)', () => {
    stubWindow('http://localhost:5174/?device=not-a-uuid')
    expect(getUrlDeviceId()).toBeUndefined()
  })

  it('returns the lowercased uuid from ?device=', () => {
    stubWindow(`http://localhost:5174/?device=${UUID.toUpperCase()}`)
    expect(getUrlDeviceId()).toBe(UUID)
  })
})

describe('reflectDeviceIdInUrl', () => {
  it('writes ?device=<id> via replaceState', () => {
    const replaceState = stubWindow('http://localhost:5174/')
    reflectDeviceIdInUrl(UUID)
    expect(replaceState).toHaveBeenCalledTimes(1)
    const written = new URL(String(replaceState.mock.calls[0][2]))
    expect(written.searchParams.get('device')).toBe(UUID)
  })

  it('is a no-op when the url already carries this id', () => {
    const replaceState = stubWindow(`http://localhost:5174/?device=${UUID}`)
    reflectDeviceIdInUrl(UUID)
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('preserves unrelated query params already on the url', () => {
    const replaceState = stubWindow('http://localhost:5174/?foo=1&bar=abc')
    reflectDeviceIdInUrl(UUID)
    const written = new URL(String(replaceState.mock.calls[0][2]))
    expect(written.searchParams.get('foo')).toBe('1')
    expect(written.searchParams.get('bar')).toBe('abc')
    expect(written.searchParams.get('device')).toBe(UUID)
  })
})
