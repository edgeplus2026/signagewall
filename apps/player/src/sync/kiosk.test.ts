import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { kioskMode } = await import('../store')
const { applyKioskMode, setKioskLockEnabled, startKioskLock } =
  await import('./kiosk')

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

describe('applyKioskMode', () => {
  it('ignores an unknown mode rather than unlocking a locked screen', () => {
    kioskMode.value = 'hard'
    applyKioskMode('locked' as never)
    expect(kioskMode.value).toBe('hard')
  })
})

describe('setKioskLockEnabled (service menu switch)', () => {
  it('turns the lock off and back on', () => {
    const setKioskLock = vi.fn()
    vi.stubGlobal('window', { AndroidBridge: { setKioskLock } })

    kioskMode.value = 'hard'
    const stop = startKioskLock()

    setKioskLockEnabled(false)
    expect(kioskMode.value).toBe('off')
    expect(setKioskLock).toHaveBeenLastCalledWith('off')

    setKioskLockEnabled(true)
    expect(kioskMode.value).toBe('hard')
    expect(setKioskLock).toHaveBeenLastCalledWith('hard')

    stop()
  })

  // What an operator means by "lock this box". The shell degrades it to
  // screen-pinning by itself on a device that isn't Device Owner — the web layer
  // must not pre-empt that by asking for less than a real lock.
  it('always asks for a hard lock, including from a legacy soft state', () => {
    kioskMode.value = 'soft'
    setKioskLockEnabled(true)
    expect(kioskMode.value).toBe('hard')
  })
})
