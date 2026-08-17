import { signal, computed } from '@preact/signals'

import {
  getCachedPairingCode,
  getStoredDailyReload,
  getStoredKioskMode,
  getStoredOrientation,
  getStoredScale,
  getStoredVolume,
} from './device'
import { activeTakeover } from './apps/takeover-apps'
import { itemRequiresNetwork } from './engine/network-apps'
import type {
  ConnectionState,
  DailyReloadSetting,
  DeviceOrientation,
  DeviceScale,
  KioskMode,
  PairingCodePayload,
  PlayerSnapshot,
} from './types'

/** The active content snapshot (from socket push or persisted IndexedDB). */
export const snapshot = signal<PlayerSnapshot | null>(null)

/**
 * Pairing code to display while unpaired; cleared once paired. Seeded from the
 * cache (if still valid) so a refresh paints the code instantly instead of a
 * skeleton; the socket re-pushes the authoritative code on connect.
 */
export const pairingCode = signal<PairingCodePayload | null>(
  getCachedPairingCode() ?? null,
)

/** True once the device holds a valid token bound to a screen. */
export const paired = signal<boolean>(false)

export const connection = signal<ConnectionState>('connecting')

/**
 * Whether the device currently has internet. Drives hiding of network-only apps
 * (YouTube/Web/Canva) from the rotation while offline. Seeded from
 * `navigator.onLine` and kept live by the online/offline listeners
 * (`sync/online.ts`); defaults to online where `navigator` is absent (tests).
 */
export const online = signal<boolean>(
  typeof navigator === 'undefined' ? true : navigator.onLine,
)

/** Playback volume 0–100, set from the CMS; persisted across reboots. */
export const volume = signal<number>(getStoredVolume())

/** Screen orientation, set from the CMS; persisted across reboots. */
export const orientation = signal<DeviceOrientation>(getStoredOrientation())

/** Content scale (object-fit mode), set from the CMS; persisted. */
export const scale = signal<DeviceScale>(getStoredScale())

/** Kiosk lockdown mode, set on the device in the service menu; persisted. */
export const kioskMode = signal<KioskMode>(getStoredKioskMode())

/** Automatic daily-reload setting, set from the CMS; persisted + offline-safe. */
export const dailyReload = signal<DailyReloadSetting>(getStoredDailyReload())

/** Diagnostics: id of the renderable currently on screen. */
export const playingItemId = signal<string | null>(null)

/**
 * Whether a screen wake lock is currently held. Diagnostics only — but the only
 * way to tell, on a TV or tablet with no console, whether the browser honoured
 * the request or is about to hand the display to its screensaver.
 */
export const screenAwake = signal<boolean>(false)

/**
 * Whether the on-device service menu is open. Global rather than local state
 * because the stage has to know: while the menu is up, the arrow keys belong to
 * it, not to slide navigation, and a tap on a menu button must not be answered by
 * the stage yanking focus back to its input shield.
 */
export const serviceMenuOpen = signal<boolean>(false)

/** Most recent non-fatal playback/runtime error, surfaced in diagnostics. */
export const lastError = signal<string | null>(null)

/**
 * False while the screen is outside its scheduled working hours (standby).
 * Driven by the availability scheduler from the snapshot's rule; defaults to
 * on so a device without a rule (or before boot rehydration) never blanks.
 */
export const availabilityOn = signal<boolean>(true)

export type View = 'emergency' | 'pairing' | 'playing' | 'standby'

/**
 * What the shell should render. Standby (pure black, engine unmounted) wins
 * whenever the availability rule says the screen is off — the rule only exists
 * on a paired snapshot, so an unpaired device still shows the pairing screen.
 * Otherwise we play whenever there is *playable* content, falling back to the
 * branded pairing/splash screen — whether unpaired (showing a code) or
 * paired-but-empty (showing the splash, never black).
 *
 * Playability accounts for connectivity: while offline, network-only apps
 * (YouTube/Web/Canva) don't count as content, so a playlist made up entirely of
 * them shows the branded splash offline (and unmounts the engine, stopping any
 * media) instead of a frozen/black frame — and flips straight back to playing
 * the instant we reconnect.
 */
export const view = computed<View>(() => {
  // An emergency beats everything, and beating STANDBY is the point: a screen
  // that is dark because the shop is shut is exactly the screen an evacuation
  // notice needs to light up. It also unmounts the stage, which stops the
  // rotation's audio — nobody should be hearing an advert under a fire notice.
  if (activeTakeover(snapshot.value)) {
    return 'emergency'
  }
  if (!availabilityOn.value) {
    return 'standby'
  }
  const items = snapshot.value?.items ?? []
  const hasPlayable = online.value
    ? items.length > 0
    : items.some((item) => !itemRequiresNetwork(item))
  return hasPlayable ? 'playing' : 'pairing'
})
