import { config } from './config'
import {
  DEFAULT_DAILY_RELOAD,
  DEFAULT_ORIENTATION,
  DEFAULT_SCALE,
  isOrientation,
  isScale,
  normalizeDailyReload,
} from './device-settings'
import { getShellVersion, getUpdateStatus } from './native/runtime'
import { isTauri } from './native/tauri'
import { getUrlDeviceId } from './recovery'
import type {
  DailyReloadSetting,
  DeviceOrientation,
  DeviceScale,
  PairingCodePayload,
  ReportedProfile,
} from './types'

const DEVICE_ID_KEY = 'edge.player.deviceId'
const TOKEN_KEY = 'edge.player.token'
const PAIRING_CODE_KEY = 'edge.player.pairingCode'
const VOLUME_KEY = 'edge.player.volume'
const ORIENTATION_KEY = 'edge.player.orientation'
const SCALE_KEY = 'edge.player.scale'
const DAILY_RELOAD_KEY = 'edge.player.dailyReload'

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
 * storage hiccup on a kiosk doesn't immediately mint a new identity.
 *
 * When localStorage holds nothing (first boot, or storage was wiped) we fall back
 * to a `deviceId` carried in the URL (`?device=<uuid>`, see `recovery.ts`) before
 * minting a fresh one — this is what lets a cleared device re-adopt its old
 * identity from a bookmarked/CMS link and slide back into its paired screen.
 * localStorage always wins over the URL, so an existing local identity is never
 * overridden by opening someone else's link.
 */
export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId
  }

  let deviceId = safeGet(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = getUrlDeviceId() ?? crypto.randomUUID()
    safeSet(DEVICE_ID_KEY, deviceId)
  }

  cachedDeviceId = deviceId
  return deviceId
}

/**
 * The persisted device id from localStorage, or undefined — a raw read that
 * never mints. Used by the native-shell boot bootstrap to decide whether to
 * promote an existing local identity into the native store.
 */
export function readLocalDeviceId(): string | undefined {
  return safeGet(DEVICE_ID_KEY) ?? undefined
}

/**
 * Forces the device identity to `id`, writing it to BOTH the in-memory cache and
 * localStorage so the synchronous {@link getDeviceId} ladder returns it no matter
 * the call order. The native-shell bootstrap calls this with the id read from the
 * native store, before anything else reads the identity.
 */
export function seedDeviceId(id: string): void {
  cachedDeviceId = id
  safeSet(DEVICE_ID_KEY, id)
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

/**
 * Persisted playback volume (0–100). Cached locally so a reboot keeps the last
 * set level instantly, before the socket re-delivers the authoritative value.
 * Defaults to full volume.
 */
export function getStoredVolume(): number {
  const raw = safeGet(VOLUME_KEY)
  if (raw === null) {
    return 100
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return 100
  }
  return Math.min(100, Math.max(0, parsed))
}

export function setStoredVolume(volume: number): void {
  safeSet(VOLUME_KEY, String(Math.round(Math.min(100, Math.max(0, volume)))))
}

/** Persisted screen orientation; defaults to landscape. */
export function getStoredOrientation(): DeviceOrientation {
  const raw = safeGet(ORIENTATION_KEY)
  return isOrientation(raw) ? raw : DEFAULT_ORIENTATION
}

export function setStoredOrientation(orientation: DeviceOrientation): void {
  safeSet(ORIENTATION_KEY, orientation)
}

/** Persisted content scale (object-fit mode); defaults to fit. */
export function getStoredScale(): DeviceScale {
  const raw = safeGet(SCALE_KEY)
  return isScale(raw) ? raw : DEFAULT_SCALE
}

export function setStoredScale(scale: DeviceScale): void {
  safeSet(SCALE_KEY, scale)
}

/**
 * Persisted daily-reload setting. Cached locally so the scheduler keeps working
 * across reboots and while offline, before the socket re-delivers it.
 */
export function getStoredDailyReload(): DailyReloadSetting {
  const raw = safeGet(DAILY_RELOAD_KEY)
  if (!raw) {
    return { ...DEFAULT_DAILY_RELOAD }
  }
  try {
    return normalizeDailyReload(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_DAILY_RELOAD }
  }
}

export function setStoredDailyReload(setting: DailyReloadSetting): void {
  safeSet(DAILY_RELOAD_KEY, JSON.stringify(setting))
}

/**
 * Host platform the player runs on, derived from the userAgent. Used to pick
 * the right restart mechanism — `window.location.reload()` is not always enough
 * (a native shell may need to relaunch the process to fully restart).
 */
export type PlayerPlatform =
  | 'android-webview'
  | 'electron'
  | 'tauri'
  | 'browser'

export function getPlatform(): PlayerPlatform {
  const ua = navigator.userAgent.toLowerCase()
  // Electron/Tauri expose themselves on the window; check those first since
  // their userAgents otherwise look like a normal Chrome browser. Reuse the
  // single Tauri detector so the two never drift on a future globals change.
  if (isTauri()) {
    return 'tauri'
  }
  if (typeof window !== 'undefined') {
    if ('electronAPI' in window || ua.includes('electron')) {
      return 'electron'
    }
  }
  // Android WebView reports "; wv)" in its userAgent (vs Chrome for Android).
  if (ua.includes('android') && ua.includes('wv')) {
    return 'android-webview'
  }
  return 'browser'
}

/**
 * The device profile reported on connect + every heartbeat. The first five
 * fields are the web-only profile; `runtime`/`shellVersion`/`updateStatus` are
 * populated by the native shell (undefined in a browser). `appVersion` is the
 * WEB bundle version — the distinct native `shellVersion` is never folded into it.
 * The shape lives in `@edge/player-contract` (`ReportedProfile`).
 */
export function getProfile(): ReportedProfile {
  return {
    platform: navigator.platform || 'web',
    userAgent: navigator.userAgent,
    appVersion: config.appVersion,
    screenWidth: Math.round(window.screen.width * window.devicePixelRatio),
    screenHeight: Math.round(window.screen.height * window.devicePixelRatio),
    runtime: getPlatform(),
    shellVersion: getShellVersion(),
    updateStatus: getUpdateStatus(),
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
