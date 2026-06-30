import { io, type Socket } from 'socket.io-client'

import { useAuthStore } from '@/features/auth/store/authStore'

/** Live presence pushed by the server when a device goes online/offline. */
export interface DevicePresenceEvent {
  screenId: string
  deviceId: string
  online: boolean
  /** False when the device was unpaired — the CMS should drop it, not mark offline. */
  paired?: boolean
  lastSeenAt: string
  appVersion?: string
}

const CmsSocketEvents = {
  WatchOrganization: 'org:watch',
  DevicePresence: 'device:presence',
  NotificationsChanged: 'notifications:changed',
} as const

/**
 * Origin of the realtime server. The REST base URL points at `/api/v1`; the
 * websocket namespace lives at the host root, so we strip the path. Falls back
 * to `VITE_WS_URL`, then the dev backend.
 */
function resolveSocketOrigin(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined
  if (explicit) return explicit

  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (apiUrl) {
    try {
      return new URL(apiUrl).origin
    } catch {
      // Relative base (e.g. "/api/v1") — same origin as the page.
      return window.location.origin
    }
  }

  return 'http://localhost:3000'
}

let socket: Socket | null = null

/** Opens (or returns) the shared CMS realtime socket, authed with the access token. */
export function getRealtimeSocket(): Socket {
  if (socket) {
    return socket
  }

  socket = io(`${resolveSocketOrigin()}/cms`, {
    transports: ['websocket', 'polling'],
    auth: (cb) => {
      cb({ token: useAuthStore.getState().token })
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15_000,
    autoConnect: true,
  })

  return socket
}

/** Asks the server to stream presence for an organization (membership-checked). */
export function watchOrganization(organizationId: string): void {
  getRealtimeSocket().emit(CmsSocketEvents.WatchOrganization, {
    organizationId,
  })
}

export function onDevicePresence(
  handler: (event: DevicePresenceEvent) => void,
): () => void {
  const instance = getRealtimeSocket()
  instance.on(CmsSocketEvents.DevicePresence, handler)
  return () => {
    instance.off(CmsSocketEvents.DevicePresence, handler)
  }
}

/**
 * Subscribes to the payload-free signal the server broadcasts when the global
 * notification set changes (publish/unpublish/delete). Handlers should refetch
 * their own unread count / inbox — no notification data is sent over the wire.
 */
export function onNotificationsChanged(handler: () => void): () => void {
  const instance = getRealtimeSocket()
  instance.on(CmsSocketEvents.NotificationsChanged, handler)
  return () => {
    instance.off(CmsSocketEvents.NotificationsChanged, handler)
  }
}

export { CmsSocketEvents }
