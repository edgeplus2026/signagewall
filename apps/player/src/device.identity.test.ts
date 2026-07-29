import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Covers the identity-precedence branch of `getDeviceId()`: localStorage always
 * wins, the URL (`?device=`) is only a fallback for a wiped/first boot, and a
 * fresh uuid is minted only when neither has one. Each case loads the module
 * fresh so the in-memory `cachedDeviceId` never leaks across tests.
 */

const DEVICE_ID_KEY = 'signagewall.player.deviceId'
const URL_UUID = '3f2a1b4c-5d6e-7a8b-9c0d-1e2f3a4b5c6d'
const STORED_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const MINTED_UUID = '11111111-2222-3333-4444-555555555555'

function fakeStorage(seed?: Record<string, string>): Storage {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

function stubEnv(storage: Storage, search: string) {
  vi.stubGlobal('window', {
    localStorage: storage,
    location: { href: `http://localhost:5174/${search}`, search },
    history: { replaceState: vi.fn() },
  })
  vi.stubGlobal('crypto', { randomUUID: () => MINTED_UUID })
}

/** Fresh module per case so `cachedDeviceId` starts unset. */
async function loadGetDeviceId() {
  vi.resetModules()
  return (await import('./device')).getDeviceId
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('getDeviceId identity precedence', () => {
  it('mints a fresh uuid when neither storage nor URL has one', async () => {
    const storage = fakeStorage()
    stubEnv(storage, '')
    const getDeviceId = await loadGetDeviceId()
    expect(getDeviceId()).toBe(MINTED_UUID)
    expect(storage.getItem(DEVICE_ID_KEY)).toBe(MINTED_UUID)
  })

  it('adopts the URL device id when storage is empty (recovery)', async () => {
    const storage = fakeStorage()
    stubEnv(storage, `?device=${URL_UUID}`)
    const getDeviceId = await loadGetDeviceId()
    expect(getDeviceId()).toBe(URL_UUID)
    // Persisted, so the recovered identity survives the next boot too.
    expect(storage.getItem(DEVICE_ID_KEY)).toBe(URL_UUID)
  })

  it('lets localStorage win over a differing URL device id', async () => {
    const storage = fakeStorage({ [DEVICE_ID_KEY]: STORED_UUID })
    stubEnv(storage, `?device=${URL_UUID}`)
    const getDeviceId = await loadGetDeviceId()
    expect(getDeviceId()).toBe(STORED_UUID)
    expect(storage.getItem(DEVICE_ID_KEY)).toBe(STORED_UUID)
  })
})
