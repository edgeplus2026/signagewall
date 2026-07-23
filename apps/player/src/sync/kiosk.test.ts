import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { kioskMode } = await import('../store')
const { startKioskLock } = await import('./kiosk')

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
