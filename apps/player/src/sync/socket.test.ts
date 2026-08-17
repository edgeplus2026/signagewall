import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerSnapshot } from '../types'

const { ioMock } = vi.hoisted(() => ({ ioMock: vi.fn() }))

const setToken = vi.fn()
const clearToken = vi.fn()
const deactivateDevice = vi.fn()
const clearUrlDeviceId = vi.fn()
const clearUrlRecoveryCode = vi.fn()
let urlRecoveryCode: string | undefined
const setCachedPairingCode = vi.fn()
const clearCachedPairingCode = vi.fn()
const saveSnapshot = vi.fn()
const clearSnapshot = vi.fn()
const clearMediaCaches = vi.fn()
const applyCommand = vi.fn()
const applySettings = vi.fn()
const applyVolume = vi.fn()
const playbackShowItem = vi.fn()

vi.mock('socket.io-client', () => ({ io: ioMock }))
vi.mock('../config', () => ({ config: { wsUrl: 'ws://test' } }))
vi.mock('../device', () => ({
  getDeviceId: () => 'device-1',
  getToken: () => 'token-1',
  getProfile: () => ({ platform: 'web' }),
  setToken,
  clearToken,
  setCachedPairingCode,
  clearCachedPairingCode,
  // ../store reads these at module load to seed its signals.
  getCachedPairingCode: () => null,
  getStoredDailyReload: () => null,
  getStoredKioskMode: () => null,
  getStoredOrientation: () => null,
  getStoredScale: () => null,
  getStoredVolume: () => null,
}))
vi.mock('../persistence/idb', () => ({
  saveSnapshot,
  clearSnapshot,
  clearMediaCaches,
}))
vi.mock('./commands', () => ({ applyCommand, applySettings, applyVolume }))
vi.mock('./playback-bus', () => ({ playbackShowItem }))
vi.mock('../native/service', () => ({
  deactivateDevice,
  setShellChannel: vi.fn(() => Promise.resolve()),
}))
// Deterministic: the heartbeat awaits this before emitting, and the real module
// reaches for the native bridge.
vi.mock('../diagnostics', () => ({
  collectDiagnostics: () => Promise.resolve(undefined),
}))
vi.mock('../recovery', () => ({
  getUrlRecoveryCode: () => urlRecoveryCode,
  clearUrlDeviceId,
  clearUrlRecoveryCode,
}))

// Imported after the mocks so socket.ts binds to the stubbed leaf modules.
const { connectPlayer, disconnectPlayer } = await import('./socket')
const { connection, paired, pairingCode, playingItemId, snapshot } =
  await import('../store')

type Handler = (...args: unknown[]) => void

interface FakeSocket {
  on: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  volatile: { emit: ReturnType<typeof vi.fn> }
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  io: { on: ReturnType<typeof vi.fn> }
  fire: (event: string, ...args: unknown[]) => void
}

function createFakeSocket(): FakeSocket {
  const handlers = new Map<string, Handler[]>()
  const register = (event: string, handler: Handler) => {
    handlers.set(event, [...(handlers.get(event) ?? []), handler])
  }
  return {
    on: vi.fn(register),
    emit: vi.fn(),
    volatile: { emit: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    io: { on: vi.fn() },
    fire: (event, ...args) => {
      for (const handler of handlers.get(event) ?? []) {
        handler(...args)
      }
    },
  }
}

const testSnapshot = (revision: string): PlayerSnapshot =>
  ({ screenId: 's1', name: 'Screen', revision, items: [] }) as PlayerSnapshot

let socket: FakeSocket

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  socket = createFakeSocket()
  ioMock.mockReturnValue(socket)
  urlRecoveryCode = undefined
  connection.value = 'offline'
  paired.value = false
  pairingCode.value = null
  snapshot.value = null
  playingItemId.value = null
})

afterEach(() => {
  // Resets the module-level socket so the next test's connectPlayer() is not
  // a no-op, and clears any pending manual-reconnect timer.
  disconnectPlayer()
  vi.useRealTimers()
})

describe('pairing lifecycle', () => {
  it('renders and caches a pairing code for an unpaired device', () => {
    connectPlayer()
    const payload = { code: 'ABC-D29', expiresAt: 'later' }

    socket.fire('pairing:code', payload)

    expect(paired.value).toBe(false)
    expect(pairingCode.value).toEqual(payload)
    expect(setCachedPairingCode).toHaveBeenCalledWith(payload)
  })

  it('persists the token and applies device state on paired', () => {
    connectPlayer()

    socket.fire('paired', {
      token: 'fresh-token',
      volume: 40,
      settings: { orientation: 'portrait' },
    })

    expect(setToken).toHaveBeenCalledWith('fresh-token')
    expect(applyVolume).toHaveBeenCalledWith(40)
    expect(applySettings).toHaveBeenCalledWith({ orientation: 'portrait' })
    expect(paired.value).toBe(true)
    expect(pairingCode.value).toBeNull()
    expect(clearCachedPairingCode).toHaveBeenCalled()
  })

  it('sends a URL recovery code in the connect auth payload', () => {
    urlRecoveryCode = 'one-time-code'
    connectPlayer()

    const options = ioMock.mock.calls[0][1] as {
      auth: (cb: (payload: Record<string, unknown>) => void) => void
    }
    const receive = vi.fn()
    options.auth(receive)

    expect(receive).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'device-1',
        token: 'token-1',
        recoveryCode: 'one-time-code',
      }),
    )
  })

  it('strips the consumed recovery code from the URL once paired', () => {
    connectPlayer()

    socket.fire('paired', { token: 'fresh-token' })

    expect(clearUrlRecoveryCode).toHaveBeenCalled()
  })

  it('resets identity and reboots into pairing on recovery:required', () => {
    connectPlayer()

    socket.fire('recovery:required')

    // URL params must go before the wipe-and-restart: a clean boot that still
    // sees ?device= would re-adopt the exact identity the server just refused.
    expect(clearUrlDeviceId).toHaveBeenCalled()
    expect(clearUrlRecoveryCode).toHaveBeenCalled()
    expect(deactivateDevice).toHaveBeenCalled()
  })

  it('wipes token, snapshot and media caches on revoke', () => {
    connectPlayer()
    snapshot.value = testSnapshot('r1')
    playingItemId.value = 'item-1'

    socket.fire('paired:revoked')

    expect(clearToken).toHaveBeenCalled()
    expect(clearCachedPairingCode).toHaveBeenCalled()
    expect(paired.value).toBe(false)
    expect(snapshot.value).toBeNull()
    expect(playingItemId.value).toBeNull()
    expect(clearSnapshot).toHaveBeenCalled()
    expect(clearMediaCaches).toHaveBeenCalled()
  })
})

describe('content and commands', () => {
  it('stores and persists a content update', () => {
    connectPlayer()
    const next = testSnapshot('r2')

    socket.fire('content:update', next)

    expect(snapshot.value).toBe(next)
    expect(saveSnapshot).toHaveBeenCalledWith(next)
  })

  it('applies live commands', () => {
    connectPlayer()

    socket.fire('command', { type: 'volume', value: 10 })

    expect(applyCommand).toHaveBeenCalledWith({ type: 'volume', value: 10 })
  })
})

describe('heartbeat and now-playing are volatile', () => {
  it('emits heartbeats on the volatile channel only', async () => {
    connectPlayer()

    // The period carries ±6s of per-device jitter, and the emit happens after
    // the (mocked) diagnostics promise resolves — advance far enough for one
    // beat and flush the microtasks it queues.
    await vi.advanceTimersByTimeAsync(36_000)

    expect(socket.volatile.emit).toHaveBeenCalledTimes(1)
    const [event, payload] = socket.volatile.emit.mock.calls[0] as [
      string,
      { profile: unknown },
    ]
    expect(event).toBe('heartbeat')
    expect(payload.profile).toEqual({ platform: 'web' })
    // A buffered (non-volatile) heartbeat would replay as a stale burst after
    // a long offline stretch — the plain emit channel must stay untouched.
    expect(socket.emit).not.toHaveBeenCalled()
  })

  it('streams item transitions volatile and answers preview requests directly', () => {
    connectPlayer()

    playingItemId.value = 'item-1'
    expect(socket.volatile.emit).toHaveBeenCalledWith('now-playing', {
      itemId: 'item-1',
    })

    // A freshly-joined preview asks explicitly; the reply is only meaningful
    // while connected, and the request itself proves the connection is up.
    socket.fire('now-playing:request')
    expect(socket.emit).toHaveBeenCalledWith('now-playing', {
      itemId: 'item-1',
    })
  })

  it('stops the heartbeat on disconnectPlayer', () => {
    connectPlayer()
    disconnectPlayer()

    vi.advanceTimersByTime(120_000)

    expect(socket.volatile.emit).not.toHaveBeenCalled()
    expect(socket.disconnect).toHaveBeenCalled()
  })
})

describe('server-initiated disconnect reconnect backoff', () => {
  it('reconnects near-instantly the first time so re-pairing stays snappy', () => {
    connectPlayer()

    socket.fire('disconnect', 'io server disconnect')

    expect(connection.value).toBe('reconnecting')
    expect(socket.connect).not.toHaveBeenCalled()
    vi.advanceTimersByTime(250)
    expect(socket.connect).toHaveBeenCalledTimes(1)
  })

  it('backs off exponentially while the server keeps force-disconnecting', () => {
    connectPlayer()

    socket.fire('disconnect', 'io server disconnect')
    vi.advanceTimersByTime(250)
    expect(socket.connect).toHaveBeenCalledTimes(1)

    socket.fire('disconnect', 'io server disconnect')
    vi.advanceTimersByTime(999)
    expect(socket.connect).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(socket.connect).toHaveBeenCalledTimes(2)

    socket.fire('disconnect', 'io server disconnect')
    vi.advanceTimersByTime(2_000)
    expect(socket.connect).toHaveBeenCalledTimes(3)
  })

  it('resets the backoff after a successful connect', () => {
    connectPlayer()

    socket.fire('disconnect', 'io server disconnect')
    vi.advanceTimersByTime(250)
    socket.fire('connect')

    socket.fire('disconnect', 'io server disconnect')
    vi.advanceTimersByTime(250)
    expect(socket.connect).toHaveBeenCalledTimes(2)
  })

  it('leaves network-level drops to socket.io itself', () => {
    connectPlayer()

    socket.fire('disconnect', 'transport close')

    expect(connection.value).toBe('offline')
    vi.advanceTimersByTime(60_000)
    expect(socket.connect).not.toHaveBeenCalled()
  })

  it('cancels a pending manual reconnect on disconnectPlayer', () => {
    connectPlayer()

    socket.fire('disconnect', 'io server disconnect')
    disconnectPlayer()
    vi.advanceTimersByTime(30_000)

    expect(socket.connect).not.toHaveBeenCalled()
  })
})
