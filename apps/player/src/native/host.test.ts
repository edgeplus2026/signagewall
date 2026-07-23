import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getTransport,
  hasNativeBridge,
  nativeInvoke,
  nativeInvokeStrict,
} from './host'

function stubWindow(props: Record<string, unknown>) {
  vi.stubGlobal('window', props)
}

/** An AndroidBridge whose sync `invoke` returns the JSON envelope for `reply`. */
function androidWindow(reply: (cmd: string, argsJson: string) => unknown) {
  const invoke = vi.fn((cmd: string, argsJson: string) =>
    JSON.stringify(reply(cmd, argsJson)),
  )
  stubWindow({ AndroidBridge: { invoke } })
  return invoke
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getTransport / hasNativeBridge', () => {
  it('is absent in a plain browser', () => {
    stubWindow({})
    expect(getTransport()).toBeUndefined()
    expect(hasNativeBridge()).toBe(false)
  })

  it('selects the Tauri transport', () => {
    stubWindow({ __TAURI__: { core: { invoke: vi.fn() } } })
    expect(hasNativeBridge()).toBe(true)
  })

  it('selects the Android transport', () => {
    stubWindow({ AndroidBridge: { invoke: vi.fn(() => '{"ok":true}') } })
    expect(hasNativeBridge()).toBe(true)
  })

  it('prefers Tauri when both are somehow present', async () => {
    const tauri = vi.fn(async () => 'tauri')
    const android = vi.fn(() => '{"ok":true,"value":"android"}')
    stubWindow({
      __TAURI__: { core: { invoke: tauri } },
      AndroidBridge: { invoke: android },
    })
    await nativeInvoke('shell_version')
    expect(tauri).toHaveBeenCalled()
    expect(android).not.toHaveBeenCalled()
  })
})

describe('nativeInvoke — Tauri transport', () => {
  it('returns undefined (no-op) in a browser', async () => {
    stubWindow({})
    expect(await nativeInvoke('shell_version')).toBeUndefined()
  })

  it('forwards cmd + args and returns the result', async () => {
    const invoke = vi.fn(async () => '1.2.3')
    stubWindow({ __TAURI__: { core: { invoke } } })
    expect(await nativeInvoke<string>('set_device_id', { id: 'x' })).toBe(
      '1.2.3',
    )
    expect(invoke).toHaveBeenCalledWith('set_device_id', { id: 'x' })
  })

  it('swallows a rejected command to undefined', async () => {
    const invoke = vi.fn(async () => {
      throw new Error('boom')
    })
    stubWindow({ __TAURI__: { core: { invoke } } })
    expect(await nativeInvoke('get_device_id')).toBeUndefined()
  })
})

describe('nativeInvoke — Android transport', () => {
  it('unwraps an ok envelope value', async () => {
    androidWindow(() => ({ ok: true, value: 'abc' }))
    expect(await nativeInvoke<string>('get_device_id')).toBe('abc')
  })

  it('serializes args into the sync bridge call', async () => {
    const invoke = androidWindow(() => ({ ok: true, value: null }))
    await nativeInvoke('set_device_id', { id: 'x' })
    expect(invoke).toHaveBeenCalledWith(
      'set_device_id',
      JSON.stringify({ id: 'x' }),
    )
  })

  it('preserves a null value (absent device id, not an error)', async () => {
    androidWindow(() => ({ ok: true, value: null }))
    expect(await nativeInvoke<string | null>('get_device_id')).toBeNull()
  })

  it('swallows an ok:false envelope to undefined (lenient)', async () => {
    androidWindow(() => ({ ok: false, error: 'nope' }))
    expect(await nativeInvoke('get_device_id')).toBeUndefined()
  })

  it('swallows a malformed (non-JSON) envelope to undefined', async () => {
    stubWindow({ AndroidBridge: { invoke: vi.fn(() => 'not json') } })
    expect(await nativeInvoke('get_device_id')).toBeUndefined()
  })
})

describe('nativeInvokeStrict', () => {
  it('throws when no native bridge is present', async () => {
    stubWindow({})
    await expect(nativeInvokeStrict('shell_version')).rejects.toThrow(
      'native bridge unavailable',
    )
  })

  it('rejects on an Android ok:false envelope (distinguishable from empty)', async () => {
    androidWindow(() => ({ ok: false, error: 'unreadable' }))
    await expect(nativeInvokeStrict('get_device_id')).rejects.toThrow(
      'unreadable',
    )
  })

  it('times out a hung command', async () => {
    stubWindow({
      __TAURI__: { core: { invoke: () => new Promise(() => undefined) } },
    })
    await expect(
      nativeInvokeStrict('get_device_id', undefined, 10),
    ).rejects.toThrow('timed out')
  })
})
