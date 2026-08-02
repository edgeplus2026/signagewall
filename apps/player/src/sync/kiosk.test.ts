import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { kioskMode } = await import('../store')
const { setKioskLockEnabled, startKioskLock } = await import('./kiosk')

beforeEach(() => {
  vi.clearAllMocks()
  kioskMode.value = 'off'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('startKioskLock', () => {
  it('drives the native bridge with the current mode on start and on change', () => {
    const setKioskLock = vi.fn()
    vi.stubGlobal('window', { AndroidBridge: { setKioskLock } })

    kioskMode.value = 'hard'
    const stop = startKioskLock()
    // Fires immediately with the persisted value — re-locks even offline.
    expect(setKioskLock).toHaveBeenLastCalledWith('hard')

    kioskMode.value = 'soft'
    expect(setKioskLock).toHaveBeenLastCalledWith('soft')

    stop()
    kioskMode.value = 'off'
    // No further calls once disposed.
    expect(setKioskLock).toHaveBeenCalledTimes(2)
  })

  it('is a no-op (never throws) when no Android bridge is present', () => {
    vi.stubGlobal('window', {})
    const stop = startKioskLock()
    expect(() => {
      kioskMode.value = 'hard'
    }).not.toThrow()
    stop()
  })

  it('swallows a throwing bridge so playback is never broken', () => {
    vi.stubGlobal('window', {
      AndroidBridge: {
        setKioskLock: () => {
          throw new Error('bridge boom')
        },
      },
    })
    const stop = startKioskLock()
    expect(() => {
      kioskMode.value = 'soft'
    }).not.toThrow()
    stop()
  })
})

describe('setKioskLockEnabled (service menu switch)', () => {
  it('turns the lock off, and back on at the level it turned off', () => {
    const setKioskLock = vi.fn()
    vi.stubGlobal('window', { AndroidBridge: { setKioskLock } })

    // The CMS put this screen on the softer level; the switch must not silently
    // promote it to `hard` on the way back.
    kioskMode.value = 'soft'
    const stop = startKioskLock()

    setKioskLockEnabled(false)
    expect(kioskMode.value).toBe('off')
    expect(setKioskLock).toHaveBeenLastCalledWith('off')

    setKioskLockEnabled(true)
    expect(kioskMode.value).toBe('soft')
    expect(setKioskLock).toHaveBeenLastCalledWith('soft')

    stop()
  })

  // What an operator means by "lock this box" — and what the shell degrades to
  // screen-pinning by itself when the device isn't Device Owner. Both modules are
  // re-imported together so the remembered level is genuinely unset AND the
  // assertion reads the same store instance the fresh module writes to.
  it('locks hard when it has never seen a locked mode', async () => {
    vi.resetModules()
    const [fresh, freshStore] = await Promise.all([
      import('./kiosk'),
      import('../store'),
    ])
    freshStore.kioskMode.value = 'off'
    fresh.setKioskLockEnabled(true)
    expect(freshStore.kioskMode.value).toBe('hard')
  })
})
