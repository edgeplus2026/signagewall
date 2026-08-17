import { effect } from '@preact/signals'
import { io, type Socket } from 'socket.io-client'

import { config } from '../config'
import { collectDiagnostics } from '../diagnostics'
import {
  clearCachedPairingCode,
  clearToken,
  getDeviceId,
  getProfile,
  getToken,
  setCachedPairingCode,
  setToken,
} from '../device'
import { clearMediaCaches, clearSnapshot, saveSnapshot } from '../persistence/idb'
import type { PreviewMode, PreviewTarget } from '../preview'
import { applyCommand, applySettings, applyVolume } from './commands'
import { registerDiagnosticsSender } from './diagnostics-report'
import {
  PLAYBACK_ACK_TIMEOUT_MS,
  registerPlaybackSender,
} from './playback-report'
import { setShellChannel } from '../native/service'
import { playbackShowItem } from './playback-bus'
import { reportPreviewStatus } from './preview-handshake'
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

  // Fire-and-forget: a report is a courtesy to whoever asked, never something the
  // device should retry or queue. If the link drops before it lands, the operator
  // asks again — one click, versus a device holding kilobytes of log for a request
  // nobody remembers making.
  registerDiagnosticsSender((report) => {
    socket?.emit('diagnostics', report)
  })

  // Playback is the opposite: it is evidence, so it is the one message that is
  // acknowledged. The device keeps the batch until this resolves true.
  registerPlaybackSender(
    (batch) =>
      new Promise<boolean>((resolve) => {
        const active = socket
        if (!active?.connected) {
          resolve(false)
          return
        }
        active
          .timeout(PLAYBACK_ACK_TIMEOUT_MS)
          .emit('playback', batch, (error: unknown, ack?: { ok?: boolean }) => {
            // A timeout arrives as an error here. Either way the batch is kept
            // and re-sent under the same number, which the server dedupes.
            resolve(!error && ack?.ok === true)
          })
      }),
  )

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
    // Hand the shell its own way to reach the backend, on every pair AND every
    // paired reconnect — the token can be re-issued, and a shell holding a stale
    // one has no channel at exactly the moment it is needed.
    const token = getToken()
    if (token) {
      void setShellChannel(token)
    }
  })

  socket.on('content:update', (next: PlayerSnapshot) => {
    snapshot.value = next
    void saveSnapshot(next)
  })

  socket.on('command', (command: PlayerCommand) => {
    applyCommand(command)
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
  stopNowPlaying = effect(() => {
    const itemId = playingItemId.value
    if (itemId) {
      socket?.emit('now-playing', { itemId })
    }
  })
}

export function disconnectPlayer(): void {
  stopHeartbeat()
  stopNowPlaying?.()
  stopNowPlaying = undefined
  socket?.disconnect()
  socket = null
}

/**
 * Opens the realtime channel as a read-only CMS preview spectator. Unlike
 * {@link connectPlayer} it authenticates with the operator's access token (not
 * a device token), never persists snapshots, starts a heartbeat, or handles
 * pairing/revoke events. The server admits it without creating a device or
 * touching presence, so it stays invisible to the real device's online/offline
 * state.
 *
 * Volume is forced to 0: a preview is always muted so it never plays audio
 * behind the operator.
 *
 * In `follow` mode (a screen mirror) it also tracks the device 1:1 — pulling
 * the device's current item on join and applying live `command`s
 * (orientation/scale, remote next/prev) so the two stay in lockstep. A
 * `standalone` preview has no device to track: it just renders the snapshot and
 * plays it on its own clock.
 */
export function connectPreview(params: {
  target: PreviewTarget
  mode: PreviewMode
  token: string
}): void {
  if (socket) {
    return
  }

  // A preview is always muted, regardless of the device's volume.
  volume.value = 0

  const follow = params.mode === 'follow'
  const target =
    params.target.kind === 'screen'
      ? { screenId: params.target.screenId }
      : { playlistId: params.target.playlistId }

  socket = io(`${config.wsUrl}/player`, {
    transports: ['websocket', 'polling'],
    auth: { preview: { ...target, token: params.token } },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15_000,
  })

  socket.on('connect', () => {
    connection.value = 'online'
    // Pull the device's current item so we sync on join, not on its next
    // transition. (Re-runs on every reconnect, which is what we want.)
    if (follow) {
      socket?.emit('now-playing:request')
    }
  })
  socket.io.on('reconnect_attempt', () => {
    connection.value = 'reconnecting'
  })
  socket.on('disconnect', (reason) => {
    connection.value = 'offline'
    // The server hung up on us — an unknown target, an operator with no
    // membership, a rejected token, or a backend that doesn't understand this
    // preview. socket.io does NOT retry a server-initiated disconnect, so this
    // is terminal: tell the CMS, or it is left showing an unexplained black
    // rectangle forever.
    if (reason === 'io server disconnect') {
      reportPreviewStatus('unavailable')
    }
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
    // A resolved-but-empty snapshot is a real answer, not a failure: every item
    // may be disabled, or its media still processing. Say so, so the CMS can
    // distinguish it from a preview that never got off the ground.
    reportPreviewStatus(next.items.length > 0 ? 'playing' : 'empty')
    if (lastNowPlayingId) {
      playbackShowItem(lastNowPlayingId)
    }
  })

  if (follow) {
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
}

/**
 * Spread, in either direction, applied once per device to the heartbeat period.
 *
 * Screens on one site share a power feed: after a cut they boot together, connect
 * together, and then beat together — a fleet-sized write spike every thirty
 * seconds, forever, all landing in the same instant. The offset is drawn once and
 * held for the session, so the cadence stays exactly 30 s per device; only the
 * phase differs between them.
 */
const HEARTBEAT_JITTER_MS = 6_000

function startHeartbeat(): void {
  stopHeartbeat()
  const period =
    HEARTBEAT_MS + Math.round((Math.random() * 2 - 1) * HEARTBEAT_JITTER_MS)
  heartbeatTimer = window.setInterval(() => {
    // Async only because the disk reading crosses the native bridge. Everything
    // else is already in memory, and a beat that cannot gather its diagnostics
    // must still report presence — so a failure here degrades to the old payload
    // rather than costing the device its heartbeat.
    void collectDiagnostics()
      .catch(() => undefined)
      .then((diagnostics) => {
        socket?.emit('heartbeat', {
          profile: { ...getProfile(), ...(diagnostics ? { diagnostics } : {}) },
          revision: snapshot.value?.revision,
          playingItemId: playingItemId.value,
          lastError: lastError.value,
        })
      })
  }, period)
}

function stopHeartbeat(): void {
  if (heartbeatTimer !== undefined) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = undefined
  }
}
