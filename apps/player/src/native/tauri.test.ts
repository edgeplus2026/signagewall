import { afterEach, describe, expect, it, vi } from 'vitest'

import { isTauri, nativeInvoke } from './tauri'

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
})

describe('nativeInvoke', () => {
  it('returns undefined (no-op) outside Tauri', async () => {
    stubWindow({})
    expect(await nativeInvoke('shell_version')).toBeUndefined()
  })

  it('returns undefined when the bridge lacks core.invoke', async () => {
    stubWindow({ __TAURI__: {} })
    expect(await nativeInvoke('shell_version')).toBeUndefined()
  })

  it('forwards cmd + args and returns the result', async () => {
    const invoke = vi.fn(async () => '1.2.3')
    stubWindow({ __TAURI__: { core: { invoke } } })
    const result = await nativeInvoke<string>('set_device_id', { id: 'x' })
    expect(result).toBe('1.2.3')
    expect(invoke).toHaveBeenCalledWith('set_device_id', { id: 'x' })
  })

  it('swallows a rejected command and returns undefined', async () => {
    const invoke = vi.fn(async () => {
      throw new Error('boom')
    })
    stubWindow({ __TAURI__: { core: { invoke } } })
    expect(await nativeInvoke('get_device_id')).toBeUndefined()
  })
})
