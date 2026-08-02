import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { screenAwake } from '../store'
import { startWakeLock } from './wake-lock'

/**
 * The lock is not something you take once — the browser drops it whenever the
 * document stops being visible and never gives it back. So what these cover is
 * the re-acquisition, and the cases where asking again would be wrong.
 */

interface FakeLock {
  released: boolean
  release: ReturnType<typeof vi.fn>
  addEventListener: (type: 'release', fn: () => void) => void
  fireRelease: () => void
}

let requests: number
let locks: FakeLock[]
let grant: boolean
let visibility: 'visible' | 'hidden'
let visibilityListeners: (() => void)[]

function makeLock(): FakeLock {
  const listeners: (() => void)[] = []
  const lock: FakeLock = {
    released: false,
    release: vi.fn(() => {
      lock.released = true
      return Promise.resolve()
    }),
    addEventListener: (_type, fn) => listeners.push(fn),
    fireRelease: () => {
      lock.released = true
      listeners.forEach((fn) => fn())
    },
  }
  return lock
}

/** Lets the pending `request('screen')` promise settle. */
const settle = () => Promise.resolve().then(() => undefined)

beforeEach(() => {
  vi.useFakeTimers()
  requests = 0
  locks = []
  grant = true
  visibility = 'visible'
  visibilityListeners = []
  // `globalThis.navigator` is getter-only in node, so it has to be stubbed.
  vi.stubGlobal('navigator', {
    wakeLock: {
      request: (type: string) => {
        requests += 1
        if (!grant) return Promise.reject(new Error('NotAllowedError'))
        const lock = makeLock()
        locks.push(lock)
        return Promise.resolve({ ...lock, type })
      },
    },
  })
  vi.stubGlobal('document', {
    get visibilityState() {
      return visibility
    },
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'visibilitychange') visibilityListeners.push(fn)
    },
    removeEventListener: (type: string, fn: () => void) => {
      if (type === 'visibilitychange') {
        const i = visibilityListeners.indexOf(fn)
        if (i >= 0) visibilityListeners.splice(i, 1)
      }
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('startWakeLock', () => {
  it('takes the lock straight away — a signage screen is never touched', async () => {
    const stop = startWakeLock()
    await settle()

    expect(requests).toBe(1)
    // Diagnostics is the only readout on a TV with no console, so it has to
    // track the real state rather than the intent.
    expect(screenAwake.value).toBe(true)
    stop()
  })

  it('reports the screen as no longer held once the browser drops the lock', async () => {
    const stop = startWakeLock()
    await settle()
    locks[0]?.fireRelease()

    expect(screenAwake.value).toBe(false)
    stop()
  })

  it('does not stack a second lock while it already holds one', async () => {
    const stop = startWakeLock()
    await settle()

    await vi.advanceTimersByTimeAsync(5 * 60_000)

    expect(requests).toBe(1)
    stop()
  })

  it('re-acquires after the browser releases it', async () => {
    const stop = startWakeLock()
    await settle()
    locks[0]?.fireRelease()

    await vi.advanceTimersByTimeAsync(60_000)

    expect(requests).toBe(2)
    stop()
  })

  it('re-acquires as soon as the page is visible again', async () => {
    const stop = startWakeLock()
    await settle()
    // Going hidden is what drops the lock in a real browser.
    locks[0]?.fireRelease()
    visibility = 'hidden'
    visibilityListeners.forEach((fn) => fn())
    await settle()
    expect(requests).toBe(1)

    visibility = 'visible'
    visibilityListeners.forEach((fn) => fn())
    await settle()

    expect(requests).toBe(2)
    stop()
  })

  it('never asks while the page is hidden', async () => {
    visibility = 'hidden'
    const stop = startWakeLock()
    await settle()

    await vi.advanceTimersByTimeAsync(5 * 60_000)

    expect(requests).toBe(0)
    stop()
  })

  // Headless Chrome refuses outright, and an insecure context has no API at all.
  // Neither may reach playback, and neither should stop us trying later.
  it('survives a denial and keeps retrying', async () => {
    grant = false
    const stop = startWakeLock()
    await settle()
    expect(requests).toBe(1)

    grant = true
    await vi.advanceTimersByTimeAsync(60_000)

    expect(requests).toBe(2)
    stop()
  })

  it('is inert where the API does not exist', async () => {
    vi.stubGlobal('navigator', {})

    const stop = startWakeLock()
    await settle()

    expect(() => {
      stop()
    }).not.toThrow()
  })

  it('releases the lock and stops re-acquiring once disposed', async () => {
    const stop = startWakeLock()
    await settle()
    const held = locks[0]

    stop()
    await vi.advanceTimersByTimeAsync(5 * 60_000)

    expect(held?.release).toHaveBeenCalled()
    expect(requests).toBe(1)
  })
})
