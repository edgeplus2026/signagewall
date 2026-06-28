import { afterEach, describe, expect, it, vi } from 'vitest'

// Pin the configured CMS origin to empty so the handshake trusts the parent
// frame relationship (the path exercised when VITE_CMS_ORIGIN is unset).
vi.mock('../config', () => ({ config: { cmsOrigin: '' } }))

const { requestPreviewToken } = await import('./preview-handshake')

interface FakeWindow {
  parent: unknown
  addEventListener: (type: string, fn: (e: MessageEvent) => void) => void
  removeEventListener: (type: string, fn: (e: MessageEvent) => void) => void
}

function embed(): {
  parent: { postMessage: ReturnType<typeof vi.fn> }
  emit: (event: Partial<MessageEvent>) => void
  listenerCount: () => number
} {
  const listeners: ((e: MessageEvent) => void)[] = []
  const parent = { postMessage: vi.fn() }
  const win: FakeWindow = {
    parent,
    addEventListener: (type, fn) => {
      if (type === 'message') listeners.push(fn)
    },
    removeEventListener: (_type, fn) => {
      const i = listeners.indexOf(fn)
      if (i >= 0) listeners.splice(i, 1)
    },
  }
  vi.stubGlobal('window', win)
  return {
    parent,
    emit: (event) => listeners.forEach((fn) => fn(event as MessageEvent)),
    listenerCount: () => listeners.length,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requestPreviewToken', () => {
  it('announces readiness, then resolves a token from the parent frame', () => {
    const { parent, emit } = embed()
    const onToken = vi.fn()

    requestPreviewToken(onToken)
    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: 'preview-ready' },
      '*',
    )

    emit({
      source: parent as unknown as MessageEventSource,
      origin: 'https://cms.example',
      data: { type: 'preview-token', token: 'tok-123' },
    })
    expect(onToken).toHaveBeenCalledWith('tok-123')
  })

  it('ignores messages that are not from the parent frame', () => {
    const { parent, emit } = embed()
    const onToken = vi.fn()
    requestPreviewToken(onToken)

    emit({
      source: { other: true } as unknown as MessageEventSource,
      origin: 'https://evil.example',
      data: { type: 'preview-token', token: 'evil' },
    })
    void parent
    expect(onToken).not.toHaveBeenCalled()
  })

  it('ignores malformed token messages', () => {
    const { parent, emit } = embed()
    const onToken = vi.fn()
    requestPreviewToken(onToken)

    emit({
      source: parent as unknown as MessageEventSource,
      origin: 'https://cms.example',
      data: { type: 'preview-token' },
    })
    emit({
      source: parent as unknown as MessageEventSource,
      origin: 'https://cms.example',
      data: { type: 'something-else', token: 'x' },
    })
    expect(onToken).not.toHaveBeenCalled()
  })

  it('detaches the listener on dispose', () => {
    const { emit, listenerCount } = embed()
    const onToken = vi.fn()
    const dispose = requestPreviewToken(onToken)
    expect(listenerCount()).toBe(1)
    dispose()
    expect(listenerCount()).toBe(0)
    emit({
      source: window.parent as unknown as MessageEventSource,
      origin: 'https://cms.example',
      data: { type: 'preview-token', token: 'late' },
    })
    expect(onToken).not.toHaveBeenCalled()
  })

  it('is a no-op when the player is not embedded (parent === self)', () => {
    const addEventListener = vi.fn()
    const win: { parent?: unknown; addEventListener: typeof addEventListener } =
      { addEventListener }
    win.parent = win // a top-level window is its own parent
    vi.stubGlobal('window', win)

    const onToken = vi.fn()
    const dispose = requestPreviewToken(onToken)

    expect(addEventListener).not.toHaveBeenCalled()
    expect(() => {
      dispose()
    }).not.toThrow()
    expect(onToken).not.toHaveBeenCalled()
  })
})
