import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getStoredDailyReload,
  getStoredOrientation,
  getStoredScale,
  getStoredVolume,
  setStoredVolume,
} from './device'

/** Minimal Map-backed localStorage so the persistence layer is testable in node. */
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

let storage: Storage

beforeEach(() => {
  storage = fakeStorage()
  vi.stubGlobal('localStorage', storage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getStoredVolume', () => {
  it('defaults to 100 when absent or unparseable', () => {
    expect(getStoredVolume()).toBe(100)
    storage.setItem('signagewall.player.volume', 'abc')
    expect(getStoredVolume()).toBe(100)
  })

  it('clamps a stored value into 0–100', () => {
    storage.setItem('signagewall.player.volume', '150')
    expect(getStoredVolume()).toBe(100)
    storage.setItem('signagewall.player.volume', '-20')
    expect(getStoredVolume()).toBe(0)
    storage.setItem('signagewall.player.volume', '37')
    expect(getStoredVolume()).toBe(37)
  })

  it('round-trips through setStoredVolume (rounded + clamped)', () => {
    setStoredVolume(50.7)
    expect(getStoredVolume()).toBe(51)
    setStoredVolume(300)
    expect(getStoredVolume()).toBe(100)
  })
})

describe('getStoredOrientation / getStoredScale', () => {
  it('returns a valid stored value, else the default', () => {
    storage.setItem('signagewall.player.orientation', 'portrait')
    expect(getStoredOrientation()).toBe('portrait')
    storage.setItem('signagewall.player.orientation', 'diagonal')
    expect(getStoredOrientation()).toBe('landscape')

    storage.setItem('signagewall.player.scale', 'zoom')
    expect(getStoredScale()).toBe('zoom')
    storage.setItem('signagewall.player.scale', 'nope')
    expect(getStoredScale()).toBe('fit')
  })
})

describe('getStoredDailyReload', () => {
  it('returns the default when absent or malformed JSON', () => {
    expect(getStoredDailyReload()).toEqual({ enabled: true, time: '03:00' })
    storage.setItem('signagewall.player.dailyReload', 'not json')
    expect(getStoredDailyReload()).toEqual({ enabled: true, time: '03:00' })
  })

  it('normalizes a stored setting (honors enabled, repairs a bad time)', () => {
    storage.setItem(
      'signagewall.player.dailyReload',
      JSON.stringify({ enabled: false, time: '05:30' }),
    )
    expect(getStoredDailyReload()).toEqual({ enabled: false, time: '05:30' })

    storage.setItem(
      'signagewall.player.dailyReload',
      JSON.stringify({ enabled: true, time: '9:9' }),
    )
    expect(getStoredDailyReload()).toEqual({ enabled: true, time: '03:00' })
  })
})

/**
 * The one platform here that is detected purely from the userAgent, so the
 * string it matches is worth pinning: LG spells the token with a digit zero on
 * the hardware, which is easy to "correct" into a bug.
 */
describe('getPlatform', () => {
  const withUserAgent = async (userAgent: string) => {
    vi.stubGlobal('navigator', { userAgent, platform: 'test' })
    vi.resetModules()
    const { getPlatform } = await import('./device')
    return getPlatform()
  }

  it('reports webOS from the userAgent an LG set actually sends', async () => {
    await expect(
      withUserAgent(
        'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36 WebAppManager',
      ),
    ).resolves.toBe('webos')
  })

  it('also accepts the documented `webOS` spelling', async () => {
    await expect(
      withUserAgent('Mozilla/5.0 (webOS.TV-2023; Linux/SmartTV) Chrome/94'),
    ).resolves.toBe('webos')
  })

  it('still reports android-webview, which must not be mistaken for webOS', async () => {
    await expect(
      withUserAgent(
        'Mozilla/5.0 (Linux; Android 11; wv) AppleWebKit/537.36 Chrome/110 Safari/537.36',
      ),
    ).resolves.toBe('android-webview')
  })

  it('falls back to browser for a plain desktop userAgent', async () => {
    await expect(
      withUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      ),
    ).resolves.toBe('browser')
  })
})
