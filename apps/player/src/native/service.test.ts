import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const clearToken = vi.fn()
const clearCachedPairingCode = vi.fn()
const clearLocalDeviceId = vi.fn()
const clearSnapshot = vi.fn(async () => {})
const clearMediaCaches = vi.fn(async () => {})

vi.mock('../device', () => ({
  clearToken,
  clearCachedPairingCode,
  clearLocalDeviceId,
}))
vi.mock('../persistence/idb', () => ({ clearSnapshot, clearMediaCaches }))

const {
  closeApp,
  deactivateDevice,
  isServiceMenuAvailable,
  loadShellDeviceInfo,
  requestRecoveryPermission,
} = await import('./service')

const reload = vi.fn()

/** A window carrying the Android bridge, with `invoke` answering the envelope. */
function stubAndroid(answers: Record<string, unknown>, extra = {}): void {
  vi.stubGlobal('window', {
    AndroidBridge: {
      invoke: (cmd: string) =>
        JSON.stringify({ ok: true, value: answers[cmd] ?? null }),
      ...extra,
    },
    location: { reload },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', { location: { reload } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isServiceMenuAvailable', () => {
  // The rule the whole bar hangs off: in a browser it must not exist at all, so
  // UP stays a key the page never claims.
  it('is false in a plain browser', () => {
    expect(isServiceMenuAvailable()).toBe(false)
  })

  it('is true on the Android shell', () => {
    stubAndroid({})
    expect(isServiceMenuAvailable()).toBe(true)
  })

  it('is true on the desktop shell', () => {
    vi.stubGlobal('window', {
      __TAURI__: { core: { invoke: async () => null } },
      location: { reload },
    })
    expect(isServiceMenuAvailable()).toBe(true)
  })

  // A shell that injects its bridge after the bundle loads still gets its menu:
  // the answer is read live, never cached at boot.
  it('follows a bridge that appears late', () => {
    expect(isServiceMenuAvailable()).toBe(false)
    stubAndroid({})
    expect(isServiceMenuAvailable()).toBe(true)
  })
})

describe('loadShellDeviceInfo', () => {
  it('returns the shell facts the menu displays', async () => {
    stubAndroid({
      device_info: {
        androidRelease: '14',
        androidSdk: 34,
        model: 'Tesla TV',
        deviceOwner: false,
      },
    })
    await expect(loadShellDeviceInfo()).resolves.toMatchObject({
      androidRelease: '14',
      model: 'Tesla TV',
      deviceOwner: false,
    })
  })

  it('carries free disk space through', async () => {
    stubAndroid({ device_info: { freeDiskBytes: 1_812_912_000 } })
    await expect(loadShellDeviceInfo()).resolves.toMatchObject({
      freeDiskBytes: 1_812_912_000,
    })
  })

  // The shell answers -1 when the OS refused to measure. One spelling of
  // "unknown" downstream, so the menu shows an em dash instead of "-1 B".
  it('normalises the shell\'s -1 to unknown', async () => {
    stubAndroid({ device_info: { freeDiskBytes: -1 } })
    const info = await loadShellDeviceInfo()
    expect(info?.freeDiskBytes).toBeUndefined()
  })

  // An older APK in the field doesn't know the command. The menu must still open
  // and simply show "—", rather than the whole thing failing to render.
  it('resolves undefined when the shell does not answer', async () => {
    vi.stubGlobal('window', {
      AndroidBridge: {
        invoke: () => {
          throw new Error('unknown command: device_info')
        },
      },
      location: { reload },
    })
    await expect(loadShellDeviceInfo()).resolves.toBeUndefined()
  })

  it('resolves undefined in a plain browser', async () => {
    await expect(loadShellDeviceInfo()).resolves.toBeUndefined()
  })
})

describe('requestRecoveryPermission', () => {
  it('reports that the settings screen opened', async () => {
    stubAndroid({ request_recovery_permission: true })
    await expect(requestRecoveryPermission()).resolves.toBe(true)
  })

  // Some TV builds omit the overlay-permission screen entirely. The bar then says
  // so, instead of offering a button that silently does nothing.
  it('reports false when the device has no such screen', async () => {
    stubAndroid({ request_recovery_permission: false })
    await expect(requestRecoveryPermission()).resolves.toBe(false)
  })

  it('reports false in a plain browser', async () => {
    await expect(requestRecoveryPermission()).resolves.toBe(false)
  })
})

describe('loadShellDeviceInfo — recovery state', () => {
  // The field failure this exists for: a firmware codec crash took the player off
  // screen and Android refused 63 consecutive attempts to put it back.
  it('carries canRecover through', async () => {
    stubAndroid({ device_info: { canRecover: false } })
    await expect(loadShellDeviceInfo()).resolves.toMatchObject({
      canRecover: false,
    })
  })
})

describe('closeApp', () => {
  it('quits through the bridge and reports that it did', () => {
    const close = vi.fn()
    stubAndroid({}, { closeApp: close })
    expect(closeApp()).toBe(true)
    expect(close).toHaveBeenCalledOnce()
  })

  // The menu disables the button on this answer: a button that does nothing
  // reads, on a TV, as a frozen device.
  it('reports false with no shell to quit', () => {
    expect(closeApp()).toBe(false)
  })

  it('reports false when the shell refuses', () => {
    stubAndroid(
      {},
      {
        closeApp: () => {
          throw new Error('nope')
        },
      },
    )
    expect(closeApp()).toBe(false)
  })
})

describe('deactivateDevice', () => {
  it('wipes every piece of local pairing state', async () => {
    await deactivateDevice()
    expect(clearToken).toHaveBeenCalledOnce()
    expect(clearCachedPairingCode).toHaveBeenCalledOnce()
    expect(clearLocalDeviceId).toHaveBeenCalledOnce()
    expect(clearSnapshot).toHaveBeenCalledOnce()
    expect(clearMediaCaches).toHaveBeenCalledOnce()
  })

  it('reloads so the browser path comes back unpaired', async () => {
    await deactivateDevice()
    expect(reload).toHaveBeenCalledOnce()
  })

  // Order is load-bearing: the native command restarts the process, so anything
  // sequenced after it would never run.
  it('asks the shell to drop its durable id, after the web wipe', async () => {
    const seen: string[] = []
    clearToken.mockImplementation(() => seen.push('web'))
    vi.stubGlobal('window', {
      AndroidBridge: {
        invoke: (cmd: string) => {
          seen.push(cmd)
          return JSON.stringify({ ok: true, value: null })
        },
      },
      location: { reload },
    })

    await deactivateDevice()
    expect(seen).toEqual(['web', 'deactivate'])
  })

  // The device must end up unpaired even if the shell rejects the command —
  // a half-deactivated screen that still holds its token is the worst outcome.
  it('still completes when the shell rejects the command', async () => {
    vi.stubGlobal('window', {
      AndroidBridge: {
        invoke: () => JSON.stringify({ ok: false, error: 'boom' }),
      },
      location: { reload },
    })
    await expect(deactivateDevice()).resolves.toBeUndefined()
    expect(clearToken).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })
})
