import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Covers the web side of the keep-alive liveness beat: it beats `report_liveness`
 * only inside a native shell, immediately and then on its interval, and its
 * disposer stops the beat. Each test loads the module fresh.
 */

/** Stubs a Tauri window and returns the invoke spy. */
function stubTauri() {
  const invoke = vi.fn(async () => undefined)
  vi.stubGlobal('window', {
    __TAURI_INTERNALS__: {},
    __TAURI__: { core: { invoke } },
  })
  return invoke
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load() {
  vi.resetModules()
  return await import('./liveness')
}

describe('startLiveness', () => {
  it('is a no-op disposer in a plain browser (never beats)', async () => {
    vi.stubGlobal('window', {})
    const { startLiveness } = await load()
    const stop = startLiveness()
    expect(() => stop()).not.toThrow()
  })

  it('beats immediately on start inside a native shell', async () => {
    const invoke = stubTauri()
    const { startLiveness } = await load()
    const stop = startLiveness()
    // The immediate beat means the liveness file exists before the first interval
    // elapses, so the watchdog never sees a spurious "never beat" gap at boot.
    expect(invoke).toHaveBeenCalledWith('report_liveness', undefined)
    expect(invoke).toHaveBeenCalledTimes(1)
    stop()
  })

  it('keeps beating on its interval and stops when disposed', async () => {
    vi.useFakeTimers()
    try {
      const invoke = stubTauri()
      const { startLiveness } = await load()
      const stop = startLiveness()
      expect(invoke).toHaveBeenCalledTimes(1) // immediate beat

      await vi.advanceTimersByTimeAsync(5000)
      expect(invoke).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(5000)
      expect(invoke).toHaveBeenCalledTimes(3)

      stop()
      await vi.advanceTimersByTimeAsync(15000)
      expect(invoke).toHaveBeenCalledTimes(3) // no more beats after dispose
    } finally {
      vi.useRealTimers()
    }
  })
})
