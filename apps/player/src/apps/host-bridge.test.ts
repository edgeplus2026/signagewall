import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  appBundleUrl,
  mountAppHost,
  type MountAppHostOptions,
} from './host-bridge'
import type { AppRenderable } from '../types'

/**
 * A fake iframe whose `contentWindow` is a stand-in we can match against and
 * spy on. `mountAppHost` only ever touches the element through the DOM-ish
 * surface exercised here, so a minimal shim keeps the test free of jsdom.
 */
function fakeIframe(): {
  el: HTMLIFrameElement
  contentWindow: { postMessage: ReturnType<typeof vi.fn> }
  fireError: () => void
} {
  const contentWindow = { postMessage: vi.fn() }
  const errorHandlers: (() => void)[] = []
  const attrs: Record<string, string> = {}
  const el = {
    contentWindow,
    className: '',
    title: '',
    set src(value: string) {
      attrs.src = value
    },
    get src(): string {
      return attrs.src ?? ''
    },
    setAttribute: (k: string, v: string) => {
      attrs[k] = v
    },
    getAttribute: (k: string) => attrs[k] ?? null,
    removeAttribute: (k: string) => {
      delete attrs[k]
    },
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'error') errorHandlers.push(fn)
    },
    removeEventListener: (type: string, fn: () => void) => {
      if (type === 'error') {
        const i = errorHandlers.indexOf(fn)
        if (i >= 0) errorHandlers.splice(i, 1)
      }
    },
    remove: vi.fn(),
  } as unknown as HTMLIFrameElement
  return {
    el,
    contentWindow,
    fireError: () => errorHandlers.forEach((fn) => fn()),
  }
}

const ITEM: AppRenderable = {
  id: 'app-1',
  kind: 'app',
  slug: 'clock',
  config: { format: '24h' },
  durationMs: 10_000,
}

const OPTIONS: MountAppHostOptions = { appsBase: '/apps', timeoutMs: 5_000 }

let messageListeners: ((e: MessageEvent) => void)[] = []
let createdIframe: ReturnType<typeof fakeIframe>
let host: { appendChild: ReturnType<typeof vi.fn> }

function emit(event: Partial<MessageEvent>): void {
  messageListeners.forEach((fn) => fn(event as MessageEvent))
}

beforeEach(() => {
  vi.useFakeTimers()
  messageListeners = []
  createdIframe = fakeIframe()
  host = { appendChild: vi.fn() }

  vi.stubGlobal('window', {
    location: { href: 'https://player.example/', origin: 'https://player.example' },
    addEventListener: (type: string, fn: (e: MessageEvent) => void) => {
      if (type === 'message') messageListeners.push(fn)
    },
    removeEventListener: (type: string, fn: (e: MessageEvent) => void) => {
      if (type === 'message') {
        const i = messageListeners.indexOf(fn)
        if (i >= 0) messageListeners.splice(i, 1)
      }
    },
  })
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag !== 'iframe') throw new Error(`unexpected createElement(${tag})`)
      return createdIframe.el
    },
  })
  // URL is a global in Node; ensure it's available after stubbing window.
  vi.stubGlobal('URL', URL)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('appBundleUrl', () => {
  it('joins base + slug + index.html, trimming a trailing slash', () => {
    expect(appBundleUrl('/apps', 'clock')).toBe('/apps/clock/index.html')
    expect(appBundleUrl('/apps/', 'clock')).toBe('/apps/clock/index.html')
    expect(appBundleUrl('https://cdn.example/a/', 'web')).toBe(
      'https://cdn.example/a/web/index.html',
    )
  })

  it('url-encodes the slug', () => {
    expect(appBundleUrl('/apps', 'a b')).toBe('/apps/a%20b/index.html')
  })
})

describe('mountAppHost', () => {
  it('mounts a sandboxed iframe and loads the bundle url', () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    expect(host.appendChild).toHaveBeenCalledWith(createdIframe.el)
    expect(createdIframe.el.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin',
    )
    // Never `no-referrer`: WebKit passes the policy on to the app's own
    // subframes, and a YouTube embed reached with no Referer fails with error 153.
    expect(createdIframe.el.getAttribute('referrerpolicy')).toBe(
      'strict-origin-when-cross-origin',
    )
    expect(createdIframe.el.src).toBe('/apps/clock/index.html')
    // dispose rejects the pending ready; we don't await it here, so swallow it.
    handle.ready.catch(() => undefined)
    handle.dispose()
  })

  it('resolves ready on app-ready and posts config to the app origin', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)

    emit({
      source: createdIframe.contentWindow as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })

    await expect(handle.ready).resolves.toBeUndefined()
    expect(createdIframe.contentWindow.postMessage).toHaveBeenCalledWith(
      { type: 'app-config', config: { format: '24h' }, data: null, meta: null },
      'https://player.example',
    )
  })

  it('forwards connector data when present', async () => {
    const item: AppRenderable = { ...ITEM, data: { temp: 21 } }
    const handle = mountAppHost(host as unknown as HTMLElement, item, OPTIONS)
    emit({
      source: createdIframe.contentWindow as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })
    await handle.ready
    expect(createdIframe.contentWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ data: { temp: 21 } }),
      'https://player.example',
    )
  })

  it('forwards data freshness meta when present', async () => {
    const item: AppRenderable = {
      ...ITEM,
      data: { temp: 21 },
      dataMeta: { fetchedAt: '2024-03-01T12:00:00Z', stale: true },
    }
    const handle = mountAppHost(host as unknown as HTMLElement, item, OPTIONS)
    emit({
      source: createdIframe.contentWindow as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })
    await handle.ready
    expect(createdIframe.contentWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { fetchedAt: '2024-03-01T12:00:00Z', stale: true },
      }),
      'https://player.example',
    )
  })

  it('ignores ready messages from other frames', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    let settled = false
    void handle.ready.then(() => (settled = true)).catch(() => undefined)

    emit({
      source: { other: true } as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(createdIframe.contentWindow.postMessage).not.toHaveBeenCalled()
    handle.dispose()
  })

  it('rejects ready on load timeout', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    const assertion = expect(handle.ready).rejects.toThrow(/timeout/)
    vi.advanceTimersByTime(5_000)
    await assertion
  })

  it('rejects ready on iframe load error', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    const assertion = expect(handle.ready).rejects.toThrow(/load error/)
    createdIframe.fireError()
    await assertion
  })

  it('dispose detaches the message listener and removes the iframe', () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    handle.ready.catch(() => undefined)
    expect(messageListeners.length).toBe(1)
    handle.dispose()
    expect(messageListeners.length).toBe(0)
    expect(createdIframe.el.remove).toHaveBeenCalled()
  })

  it('dispose rejects a still-pending ready (superseded load never hangs)', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    const assertion = expect(handle.ready).rejects.toThrow(/disposed/)
    handle.dispose()
    await assertion
  })

  it('dispose after ready resolved does not reject', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    emit({
      source: createdIframe.contentWindow as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })
    await handle.ready
    // Must not turn the resolved promise into an unhandled rejection.
    expect(() => handle.dispose()).not.toThrow()
    await expect(handle.ready).resolves.toBeUndefined()
  })

  it('a late ready after timeout does not post config', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    const assertion = expect(handle.ready).rejects.toThrow(/timeout/)
    vi.advanceTimersByTime(5_000)
    await assertion

    emit({
      source: createdIframe.contentWindow as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })
    expect(createdIframe.contentWindow.postMessage).not.toHaveBeenCalled()
  })

  it('setActive after ready posts app-active (with mute) to the app origin', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    emit({
      source: createdIframe.contentWindow as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })
    await handle.ready

    handle.setActive(true, false)
    expect(createdIframe.contentWindow.postMessage).toHaveBeenLastCalledWith(
      { type: 'app-active', active: true, muted: false },
      'https://player.example',
    )
    // A volume-0 change re-pushes with muted true.
    handle.setActive(true, true)
    expect(createdIframe.contentWindow.postMessage).toHaveBeenLastCalledWith(
      { type: 'app-active', active: true, muted: true },
      'https://player.example',
    )
  })

  it('setActive before ready is buffered and flushed after config on ready', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    // Slot activated mid-handshake: no message may go out until the app listens.
    handle.setActive(true, false)
    expect(createdIframe.contentWindow.postMessage).not.toHaveBeenCalled()

    emit({
      source: createdIframe.contentWindow as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })
    await handle.ready

    // Config lands first, then the buffered active/mute directive.
    expect(createdIframe.contentWindow.postMessage).toHaveBeenNthCalledWith(
      1,
      { type: 'app-config', config: { format: '24h' }, data: null, meta: null },
      'https://player.example',
    )
    expect(createdIframe.contentWindow.postMessage).toHaveBeenNthCalledWith(
      2,
      { type: 'app-active', active: true, muted: false },
      'https://player.example',
    )
  })

  it('setActive before ready only flushes the latest directive', async () => {
    const handle = mountAppHost(host as unknown as HTMLElement, ITEM, OPTIONS)
    handle.setActive(true, false)
    handle.setActive(false, true)

    emit({
      source: createdIframe.contentWindow as unknown as MessageEventSource,
      data: { type: 'app-ready' },
    })
    await handle.ready

    const activeCalls = createdIframe.contentWindow.postMessage.mock.calls.filter(
      ([msg]) => (msg as { type?: string }).type === 'app-active',
    )
    expect(activeCalls).toEqual([
      [{ type: 'app-active', active: false, muted: true }, 'https://player.example'],
    ])
  })
})
