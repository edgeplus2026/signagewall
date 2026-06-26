import { io, type Socket } from 'socket.io-client'

import { config } from '../config'
import {
  clearCachedPairingCode,
  clearToken,
  getDeviceId,
  getProfile,
  getToken,
  setCachedPairingCode,
  setToken,
} from '../device'
import { saveSnapshot } from '../persistence/idb'
import {
  connection,
  lastError,
  paired,
  pairingCode,
  playingItemId,
  snapshot,
} from '../store'
import type {
  PairedPayload,
  PairingCodePayload,
  PlayerSnapshot,
} from '../types'

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
  socket.on('disconnect', () => {
    connection.value = 'offline'
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
    paired.value = true
    pairingCode.value = null
    clearCachedPairingCode()
  })

  socket.on('content:update', (next: PlayerSnapshot) => {
    snapshot.value = next
    void saveSnapshot(next)
  })

  socket.on('paired:revoked', () => {
    clearToken()
    clearCachedPairingCode()
    paired.value = false
    snapshot.value = null
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
