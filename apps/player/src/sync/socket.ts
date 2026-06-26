import { io, type Socket } from 'socket.io-client'

import { config } from '../config'
import {
  clearCachedPairingCode,
  clearToken,
  getDeviceId,
  getProfile,
  getToken,
  setCachedPairingCode,
  setStoredDailyReload,
  setStoredOrientation,
  setStoredScale,
  setStoredVolume,
  setToken,
} from '../device'
import { isOrientation, isScale, normalizeDailyReload } from '../device-settings'
import { restartPlayer } from '../restart'
import { clearMediaCaches, clearSnapshot, saveSnapshot } from '../persistence/idb'
import {
  connection,
  dailyReload,
  lastError,
  orientation,
  paired,
  pairingCode,
  playingItemId,
  scale,
  snapshot,
  volume,
} from '../store'
import type {
  DailyReloadSetting,
  DeviceOrientation,
  DeviceScale,
  DeviceSettings,
  PairedPayload,
  PairingCodePayload,
  PlayerCommand,
  PlayerSnapshot,
} from '../types'

/** Applies + persists a new volume (0–100), ignoring out-of-range values. */
function applyVolume(next: number): void {
  if (!Number.isFinite(next)) {
    return
  }
  const clamped = Math.min(100, Math.max(0, Math.round(next)))
  volume.value = clamped
  setStoredVolume(clamped)
}

/** Applies + persists an orientation, ignoring unknown values. */
function applyOrientation(next: DeviceOrientation): void {
  if (!isOrientation(next)) {
    return
  }
  orientation.value = next
  setStoredOrientation(next)
}

/** Applies + persists a content scale, ignoring unknown values. */
function applyScale(next: DeviceScale): void {
  if (!isScale(next)) {
    return
  }
  scale.value = next
  setStoredScale(next)
}

/**
 * Applies + persists the daily-reload setting. Normalizes first so a malformed
 * time falls back to the default without dropping the `enabled` flag (a disable
 * with a bad time still disables). The scheduler reacts to the `dailyReload`
 * signal (see startDailyReload), so updating it here rebases the loop.
 */
function applyDailyReload(next: DailyReloadSetting): void {
  const normalized = normalizeDailyReload(next)
  dailyReload.value = normalized
  setStoredDailyReload(normalized)
}

/** Applies all display + power settings delivered on (re)connect / pair. */
function applySettings(settings: DeviceSettings): void {
  applyOrientation(settings.orientation)
  applyScale(settings.scale)
  applyDailyReload(settings.dailyReload)
}

const HEARTBEAT_MS = 30_000

let socket: Socket | null = null
let heartbeatTimer: number | undefined

/**
 * Opens the realtime channel. The auth payload is a function so the freshest
 * token + content revision are sent on every (re)connect — letting the server
 * skip re-pushing an unchanged snapshot (revision-delta).
 */
export function connectPlayer(): void {
  if (socket) {
    return
  }

  const deviceId = getDeviceId()

  socket = io(`${config.wsUrl}/player`, {
    transports: ['websocket', 'polling'],
    auth: (cb) =>
      cb({
        deviceId,
        token: getToken(),
        revision: snapshot.value?.revision,
        profile: getProfile(),
      }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15_000,
  })

  socket.on('connect', () => {
    connection.value = 'online'
  })
  socket.io.on('reconnect_attempt', () => {
    connection.value = 'reconnecting'
  })
  socket.on('disconnect', (reason) => {
    connection.value = 'offline'
    // A server-initiated disconnect (e.g. on unpair/revoke) sets the reason to
    // 'io server disconnect', and socket.io does NOT auto-reconnect in that
    // case. Reconnect manually so the player immediately re-handshakes
    // token-less and gets a fresh pairing code — no page refresh required.
    if (reason === 'io server disconnect') {
      connection.value = 'reconnecting'
      socket?.connect()
    }
  })

  socket.on('pairing:code', (payload: PairingCodePayload) => {
    paired.value = false
    pairingCode.value = payload
    setCachedPairingCode(payload)
  })

  socket.on('paired', (payload: PairedPayload) => {
    if (payload.token) {
      setToken(payload.token)
    }
    if (payload.volume !== undefined) {
      applyVolume(payload.volume)
    }
    if (payload.settings) {
      applySettings(payload.settings)
    }
    paired.value = true
    pairingCode.value = null
    clearCachedPairingCode()
  })

  socket.on('content:update', (next: PlayerSnapshot) => {
    snapshot.value = next
    void saveSnapshot(next)
  })

  socket.on('command', (command: PlayerCommand) => {
    switch (command?.type) {
      case 'volume':
        applyVolume(command.value)
        break
      case 'orientation':
        applyOrientation(command.value)
        break
      case 'scale':
        applyScale(command.value)
        break
      case 'dailyReload':
        applyDailyReload(command.value)
        break
      case 'restart':
        restartPlayer()
        break
      default:
        break
    }
  })

  socket.on('paired:revoked', () => {
    // Fully reset to an unpaired slate: drop the token, stop playback, and wipe
    // every persisted trace of the old screen (cached snapshot + media bytes)
    // so the display can never resurface revoked content — even after a reload
    // or while offline.
    clearToken()
    clearCachedPairingCode()
    paired.value = false
    snapshot.value = null
    playingItemId.value = null
    void clearSnapshot()
    void clearMediaCaches()
  })

  startHeartbeat()
}

export function disconnectPlayer(): void {
  stopHeartbeat()
  socket?.disconnect()
  socket = null
}

function startHeartbeat(): void {
  stopHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    socket?.emit('heartbeat', {
      profile: getProfile(),
      revision: snapshot.value?.revision,
      playingItemId: playingItemId.value,
      lastError: lastError.value,
    })
  }, HEARTBEAT_MS)
}

function stopHeartbeat(): void {
  if (heartbeatTimer !== undefined) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = undefined
  }
}
