import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Covers the native-shell identity ladder (native store → localStorage → URL →
 * mint) and the promote-on-first-upgrade case. Each test loads the module graph
 * fresh so device.ts's in-memory cache never leaks across cases.
 */

const DEVICE_ID_KEY = 'signagewall.player.deviceId'
const NATIVE_ID = '11111111-1111-1111-1111-111111111111'
const LOCAL_ID = '22222222-2222-2222-2222-222222222222'
const URL_ID = '33333333-3333-3333-3333-333333333333'
const MINTED_ID = '44444444-4444-4444-4444-444444444444'

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

/** Stubs a Tauri window whose native store returns `nativeId` (or null). */
function stubTauri(opts: {
  storage: Storage
  nativeId: string | null
  search?: string
}) {
  const invoke = vi.fn(async (cmd: string) => {
    if (cmd === 'get_device_id') return opts.nativeId
    if (cmd === 'shell_version') return '1.2.3'
    return undefined
  })
  vi.stubGlobal('window', {
    __TAURI_INTERNALS__: {},
    __TAURI__: { core: { invoke } },
    localStorage: opts.storage,
    location: { search: opts.search ?? '', href: 'tauri://localhost/' },
  })
  vi.stubGlobal('crypto', { randomUUID: () => MINTED_ID })
  return invoke
}

/** Ids passed to the native `set_device_id` command during the run. */
function nativeWrites(invoke: ReturnType<typeof vi.fn>): string[] {
  return invoke.mock.calls
    .filter((c) => c[0] === 'set_device_id')
    .map((c) => (c[1] as { id: string }).id)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load() {
  vi.resetModules()
  const bootstrap = await import('./bootstrap')
  const device = await import('../device')
  return { ...bootstrap, ...device }
}

describe('bootstrapNativeIdentity', () => {
  it('is a no-op in a plain browser (no native store touched)', async () => {
    const storage = fakeStorage()
    vi.stubGlobal('window', { localStorage: storage, location: { search: '' } })
    vi.stubGlobal('crypto', { randomUUID: () => MINTED_ID })
    const { bootstrapNativeIdentity } = await load()
    await bootstrapNativeIdentity()
    expect(storage.getItem(DEVICE_ID_KEY)).toBeNull()
  })

  it('adopts the native id when present (native wins)', async () => {
    const storage = fakeStorage({ [DEVICE_ID_KEY]: LOCAL_ID })
    const invoke = stubTauri({ storage, nativeId: NATIVE_ID })
    const { bootstrapNativeIdentity, getDeviceId } = await load()
    await bootstrapNativeIdentity()
    expect(getDeviceId()).toBe(NATIVE_ID)
    expect(storage.getItem(DEVICE_ID_KEY)).toBe(NATIVE_ID)
    // Native already had it — must not re-write the store.
    expect(nativeWrites(invoke)).toEqual([])
  })

  it('promotes the existing localStorage id into the native store on first upgrade', async () => {
    const storage = fakeStorage({ [DEVICE_ID_KEY]: LOCAL_ID })
    const invoke = stubTauri({ storage, nativeId: null })
    const { bootstrapNativeIdentity, getDeviceId } = await load()
    await bootstrapNativeIdentity()
    expect(getDeviceId()).toBe(LOCAL_ID)
    expect(nativeWrites(invoke)).toEqual([LOCAL_ID])
  })

  it('adopts the URL id when native + local are both empty', async () => {
    const storage = fakeStorage()
    const invoke = stubTauri({
      storage,
      nativeId: null,
      search: `?device=${URL_ID}`,
    })
    const { bootstrapNativeIdentity, getDeviceId } = await load()
    await bootstrapNativeIdentity()
    expect(getDeviceId()).toBe(URL_ID)
    expect(nativeWrites(invoke)).toEqual([URL_ID])
  })

  it('mints a fresh id when native, local, and URL are all empty', async () => {
    const storage = fakeStorage()
    const invoke = stubTauri({ storage, nativeId: null })
    const { bootstrapNativeIdentity, getDeviceId } = await load()
    await bootstrapNativeIdentity()
    expect(getDeviceId()).toBe(MINTED_ID)
    expect(nativeWrites(invoke)).toEqual([MINTED_ID])
  })

  it('does NOT overwrite the store when the read fails, even with everything else empty', async () => {
    // Regression: a transient get_device_id failure (IO error / corrupt file /
    // hung IPC) must not be mistaken for "absent" and clobbered with a fresh
    // mint — the store may still hold the real id, and overwriting it would
    // permanently strand the paired screen.
    const storage = fakeStorage() // localStorage also wiped: the worst case
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'get_device_id') throw new Error('config disk IO error')
      if (cmd === 'shell_version') return '1.2.3'
      return undefined
    })
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      __TAURI__: { core: { invoke } },
      localStorage: storage,
      location: { search: '', href: 'tauri://localhost/' },
    })
    vi.stubGlobal('crypto', { randomUUID: () => MINTED_ID })
    const { bootstrapNativeIdentity, getDeviceId } = await load()
    await bootstrapNativeIdentity()
    // A usable identity is seeded for THIS session…
    expect(getDeviceId()).toBe(MINTED_ID)
    // …but the native store is left untouched (no clobbering write).
    expect(nativeWrites(invoke)).toEqual([])
  })
})
