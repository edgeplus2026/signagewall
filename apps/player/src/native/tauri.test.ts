import { afterEach, describe, expect, it, vi } from 'vitest'

import { isTauri, tauriTransport } from './tauri'

function stubWindow(props: Record<string, unknown>) {
  vi.stubGlobal('window', props)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isTauri', () => {
  it('is false in a plain browser', () => {
    stubWindow({})
    expect(isTauri()).toBe(false)
  })

  it('is true when the Tauri v2 internals global is present', () => {
    stubWindow({ __TAURI_INTERNALS__: {} })
    expect(isTauri()).toBe(true)
  })

  it('is true when the withGlobalTauri global is present', () => {
    stubWindow({ __TAURI__: {} })
    expect(isTauri()).toBe(true)
  })

  it('stays false for an Android WebView shell (must not report tauri)', () => {
    stubWindow({ AndroidBridge: { invoke: vi.fn() } })
    expect(isTauri()).toBe(false)
  })
})

describe('tauriTransport', () => {
  it('is undefined when the bridge lacks core.invoke', () => {
    stubWindow({ __TAURI__: {} })
    expect(tauriTransport()).toBeUndefined()
  })

  it('forwards cmd + args to core.invoke', async () => {
    const invoke = vi.fn(async () => '1.2.3')
    stubWindow({ __TAURI__: { core: { invoke } } })
    const transport = tauriTransport()
    expect(transport).toBeDefined()
    await expect(transport!.invoke('set_device_id', { id: 'x' })).resolves.toBe(
      '1.2.3',
    )
    expect(invoke).toHaveBeenCalledWith('set_device_id', { id: 'x' })
  })
})
