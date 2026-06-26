import { config } from './config'
import type { PairingCodePayload } from './types'

const DEVICE_ID_KEY = 'edge.player.deviceId'
const TOKEN_KEY = 'edge.player.token'
const PAIRING_CODE_KEY = 'edge.player.pairingCode'

/**
 * In-memory copy of the device id, held for the lifetime of the page. It lets a
 * transient localStorage failure (private mode, quota, a kiosk that wipes
 * storage mid-session) reuse the same identity instead of minting a new one and
 * forcing a re-pair. Cleared only when the tab is reloaded/closed.
 */
let cachedDeviceId: string | undefined

/**
 * Reads (or lazily creates) the stable device id. We persist it in both
 * localStorage and — best effort — keep an in-memory copy, so a transient
 * storage hiccup on a kiosk doesn't immediately mint a new identity. Clearing
 * storage intentionally yields a brand-new device that must be re-paired.
 */
export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId
  }

  let deviceId = safeGet(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = crypto.randomUUID()
    safeSet(DEVICE_ID_KEY, deviceId)
  }

  cachedDeviceId = deviceId
  return deviceId
}

export function getToken(): string | undefined {
  return safeGet(TOKEN_KEY) ?? undefined
}

export function setToken(token: string): void {
  safeSet(TOKEN_KEY, token)
}

export function clearToken(): void {
  safeRemove(TOKEN_KEY)
}

/**
 * Caches the pairing code so a refresh can paint it instantly instead of
 * flashing a skeleton while the socket reconnects. The server still re-pushes
 * the authoritative code on connect — this is only an optimistic prefill.
 */
export function setCachedPairingCode(payload: PairingCodePayload): void {
  safeSet(PAIRING_CODE_KEY, JSON.stringify(payload))
}

/**
 * Returns the cached pairing code, or undefined if absent, malformed, or
 * expired — so we never render a dead code that the dashboard would reject.
 */
export function getCachedPairingCode(): PairingCodePayload | undefined {
  const raw = safeGet(PAIRING_CODE_KEY)
  if (!raw) {
    return undefined
  }

  try {
    const payload = JSON.parse(raw) as PairingCodePayload
    if (
      typeof payload?.code !== 'string' ||
      typeof payload?.expiresAt !== 'string' ||
      Date.parse(payload.expiresAt) <= Date.now()
    ) {
      return undefined
    }
    return payload
  } catch {
    return undefined
  }
}

export function clearCachedPairingCode(): void {
  safeRemove(PAIRING_CODE_KEY)
}

export interface DeviceProfile {
  platform: string
  userAgent: string
  appVersion: string
  screenWidth: number
  screenHeight: number
}

export function getProfile(): DeviceProfile {
  return {
    platform: navigator.platform || 'web',
    userAgent: navigator.userAgent,
    appVersion: config.appVersion,
    screenWidth: Math.round(window.screen.width * window.devicePixelRatio),
    screenHeight: Math.round(window.screen.height * window.devicePixelRatio),
  }
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private mode / quota) — non-fatal.
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
