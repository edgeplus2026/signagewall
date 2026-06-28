import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { restartPlayer } from './restart'

const reload = vi.fn()

function setEnv(
  userAgent: string,
  extra: Record<string, unknown> = {},
): void {
  vi.stubGlobal('navigator', { userAgent })
  vi.stubGlobal('window', { location: { reload }, ...extra })
}

beforeEach(() => {
  reload.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('restartPlayer', () => {
  it('relaunches via the Tauri bridge when present', () => {
    const relaunch = vi.fn()
    setEnv('mozilla/5.0', { __TAURI__: { process: { relaunch } } })
    restartPlayer()
    expect(relaunch).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
  })

  it('restarts via the Electron bridge when present', () => {
    const restart = vi.fn()
    setEnv('mozilla/5.0 electron/1.0', { electronAPI: { restart } })
    restartPlayer()
    expect(restart).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
  })

  it('restarts via the Android WebView bridge when present', () => {
    const restart = vi.fn()
    setEnv('mozilla/5.0 (linux; android 13; wv)', {
      AndroidBridge: { restart },
    })
    restartPlayer()
    expect(restart).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
  })

  it('falls back to a page reload in a plain browser', () => {
    setEnv('mozilla/5.0 chrome/120')
    restartPlayer()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('falls back to a reload when a native bridge throws', () => {
    const restart = vi.fn(() => {
      throw new Error('bridge gone')
    })
    setEnv('mozilla/5.0 electron/1.0', { electronAPI: { restart } })
    restartPlayer()
    expect(restart).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })
})
