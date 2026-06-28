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
    storage.setItem('edge.player.volume', 'abc')
    expect(getStoredVolume()).toBe(100)
  })

  it('clamps a stored value into 0–100', () => {
    storage.setItem('edge.player.volume', '150')
    expect(getStoredVolume()).toBe(100)
    storage.setItem('edge.player.volume', '-20')
    expect(getStoredVolume()).toBe(0)
    storage.setItem('edge.player.volume', '37')
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
    storage.setItem('edge.player.orientation', 'portrait')
    expect(getStoredOrientation()).toBe('portrait')
    storage.setItem('edge.player.orientation', 'diagonal')
    expect(getStoredOrientation()).toBe('landscape')

    storage.setItem('edge.player.scale', 'zoom')
    expect(getStoredScale()).toBe('zoom')
    storage.setItem('edge.player.scale', 'nope')
    expect(getStoredScale()).toBe('fit')
  })
})

describe('getStoredDailyReload', () => {
  it('returns the default when absent or malformed JSON', () => {
    expect(getStoredDailyReload()).toEqual({ enabled: true, time: '03:00' })
    storage.setItem('edge.player.dailyReload', 'not json')
    expect(getStoredDailyReload()).toEqual({ enabled: true, time: '03:00' })
  })

  it('normalizes a stored setting (honors enabled, repairs a bad time)', () => {
    storage.setItem(
      'edge.player.dailyReload',
      JSON.stringify({ enabled: false, time: '05:30' }),
    )
    expect(getStoredDailyReload()).toEqual({ enabled: false, time: '05:30' })

    storage.setItem(
      'edge.player.dailyReload',
      JSON.stringify({ enabled: true, time: '9:9' }),
    )
    expect(getStoredDailyReload()).toEqual({ enabled: true, time: '03:00' })
  })
})
