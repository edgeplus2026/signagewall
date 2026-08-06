import { effect } from '@preact/signals'
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
import { deactivateDevice } from '../native/service'
import { clearMediaCaches, clearSnapshot, saveSnapshot } from '../persistence/idb'
import {
  clearUrlDeviceId,
  clearUrlRecoveryCode,
  getUrlRecoveryCode,
} from '../recovery'
import { applyCommand, applySettings, applyVolume } from './commands'
import { playbackShowItem } from './playback-bus'
import {
  connection,
  lastError,
  paired,
  pairingCode,
  playingItemId,
  snapshot,
  volume,
} from '../store'
import type {
  PairedPayload,
  PairingCodePayload,
  PlayerCommand,
  PlayerSnapshot,
} from '../types'

const HEARTBEAT_MS = 30_000

let socket: Socket | null = null
let heartbeatTimer: number | undefined
/** Disposes the effect that streams now-playing to the server (real device). */
let stopNowPlaying: (() => void) | undefined
/** Pending manual reconnect after a server-initiated disconnect. */
let serverReconnectTimer: number | undefined
/** Consecutive server-initiated disconnects since the last successful connect. */
let serverDisconnects = 0

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
        // Single-use CMS-minted code (?recovery=); the server consumes it on
        // first redemption, so re-sending a spent one on reconnect is inert.
        recoveryCode: getUrlRecoveryCode(),
        revision: snapshot.value?.revision,
        profile: getProfile(),
      }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15_000,
  })

  socket.on('connect', () => {
    connection.value = 'online'
    serverDisconnects = 0
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
    // The first retry is near-instant to keep re-pairing snappy, but repeats
    // back off exponentially so a server that keeps force-disconnecting (bad
    // deploy, incident) isn't hammered by the whole fleet in a tight loop.
    if (reason === 'io server disconnect') {
      connection.value = 'reconnecting'
      const delay =
        serverDisconnects === 0
          ? 250
          : Math.min(1000 * 2 ** (serverDisconnects - 1), 30_000)
      serverDisconnects += 1
      clearTimeout(serverReconnectTimer)
      serverReconnectTimer = window.setTimeout(() => socket?.connect(), delay)
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
      // Any recovery code in the URL is now consumed (or moot) — strip it so
      // the address bar never shows a spent credential.
      clearUrlRecoveryCode()
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
    applyCommand(command)
  })

  // The server refused this known paired deviceId: no device token, no valid
  // recovery code. The identity is unusable — wipe it and boot fresh into the
  // pairing flow. URL params go first, otherwise the clean boot would re-adopt
  // the exact id that was just refused and loop forever.
  socket.on('recovery:required', () => {
    clearUrlDeviceId()
    clearUrlRecoveryCode()
    void deactivateDevice()
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

  // A freshly-joined preview asks for the current item; re-announce it so the
  // preview syncs immediately instead of waiting for our next transition.
  socket.on('now-playing:request', () => {
    const itemId = playingItemId.value
    if (itemId) {
      socket?.emit('now-playing', { itemId })
    }
  })

  startHeartbeat()

  // Stream the on-screen item to the server as it changes, so CMS preview
  // spectators mirror this device 1:1. The signal updates once per transition,
  // so this fires exactly on each item change (and once for the first item).
  // Volatile: while disconnected socket.io would otherwise buffer every emit
  // and replay a stale burst on reconnect (unbounded memory on a screen that
  // is offline for days). A dropped transition self-heals via
  // 'now-playing:request' when a preview attaches.
  stopNowPlaying = effect(() => {
    const itemId = playingItemId.value
    if (itemId) {
      socket?.volatile.emit('now-playing', { itemId })
    }
  })
}

export function disconnectPlayer(): void {
  stopHeartbeat()
  stopNowPlaying?.()
  stopNowPlaying = undefined
  clearTimeout(serverReconnectTimer)
  serverReconnectTimer = undefined
  serverDisconnects = 0
  socket?.disconnect()
  socket = null
}

/**
 * Opens the realtime channel as a read-only CMS preview spectator. Unlike
 * {@link connectPlayer} it authenticates with the operator's access token (not
 * a device token), never persists snapshots, starts a heartbeat, or handles
 * pairing/revoke events. The server admits it to the screen's room without
 * creating a device or touching presence, so it stays invisible to the real
 * device's online/offline state.
 *
 * It still applies live `command`s (orientation/scale, and remote next/prev) so
 * the preview mirrors the device in lockstep — except volume, which is forced
 * to 0: a preview is always muted so it never plays audio behind the operator.
 */
export function connectPreview(params: {
  screenId: string
  token: string
}): void {
  if (socket) {
    return
  }

  // A preview is always muted, regardless of the device's volume.
  volume.value = 0

  socket = io(`${config.wsUrl}/player`, {
    transports: ['websocket', 'polling'],
    auth: { preview: { screenId: params.screenId, token: params.token } },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15_000,
  })

  socket.on('connect', () => {
    connection.value = 'online'
    // Pull the device's current item so we sync on join, not on its next
    // transition. (Re-runs on every reconnect, which is what we want.)
    socket?.emit('now-playing:request')
  })
  socket.io.on('reconnect_attempt', () => {
    connection.value = 'reconnecting'
  })
  socket.on('disconnect', () => {
    connection.value = 'offline'
  })

  // The device's last reported item, remembered so we can re-apply it after a
  // content reload — `now-playing` and `content:update` can arrive in either
  // order, and a fresh snapshot resets the follow engine to item 0.
  let lastNowPlayingId: string | undefined

  // Render snapshots, but never persist them — a preview must not pollute the
  // device's offline cache. Re-apply the known now-playing item so a content
  // update doesn't leave us parked on item 0.
  socket.on('content:update', (next: PlayerSnapshot) => {
    snapshot.value = next
    if (lastNowPlayingId) {
      playbackShowItem(lastNowPlayingId)
    }
  })

  // Mirror the device 1:1: jump to whatever item it reports as on screen. The
  // preview's engine runs in follow mode, so this is what drives its playback.
  socket.on('now-playing', (payload: { itemId?: string }) => {
    if (payload?.itemId) {
      lastNowPlayingId = payload.itemId
      playbackShowItem(payload.itemId)
    }
  })

  // Mirror live display commands so the preview tracks the device. The preview
  // flag drops the device-only commands (volume — always muted — plus
  // restart/dailyReload).
  socket.on('command', (command: PlayerCommand) => {
    applyCommand(command, { preview: true })
  })
}

function startHeartbeat(): void {
  stopHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    // Volatile: a heartbeat is only meaningful now. Buffered emits would pile
    // up for the whole offline period and flood the server as a stale burst on
    // reconnect.
    socket?.volatile.emit('heartbeat', {
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
