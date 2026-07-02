import { signal, computed } from '@preact/signals'

import {
  getCachedPairingCode,
  getStoredDailyReload,
  getStoredOrientation,
  getStoredScale,
  getStoredVolume,
} from './device'
import type {
  ConnectionState,
  DailyReloadSetting,
  DeviceOrientation,
  DeviceScale,
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

/** Playback volume 0–100, set from the CMS; persisted across reboots. */
export const volume = signal<number>(getStoredVolume())

/** Screen orientation, set from the CMS; persisted across reboots. */
export const orientation = signal<DeviceOrientation>(getStoredOrientation())

/** Content scale (object-fit mode), set from the CMS; persisted. */
export const scale = signal<DeviceScale>(getStoredScale())

/** Automatic daily-reload setting, set from the CMS; persisted + offline-safe. */
export const dailyReload = signal<DailyReloadSetting>(getStoredDailyReload())

/** Diagnostics: id of the renderable currently on screen. */
export const playingItemId = signal<string | null>(null)

/** Most recent non-fatal playback/runtime error, surfaced in diagnostics. */
export const lastError = signal<string | null>(null)

/**
 * False while the screen is outside its scheduled working hours (standby).
 * Driven by the availability scheduler from the snapshot's rule; defaults to
 * on so a device without a rule (or before boot rehydration) never blanks.
 */
export const availabilityOn = signal<boolean>(true)

export type View = 'pairing' | 'playing' | 'standby'

/**
 * What the shell should render. Standby (pure black, engine unmounted) wins
 * whenever the availability rule says the screen is off — the rule only exists
 * on a paired snapshot, so an unpaired device still shows the pairing screen.
 * Otherwise we play whenever there is content, falling back to the branded
 * pairing/splash screen — whether unpaired (showing a code) or paired-but-empty
 * (showing the splash, never black).
 */
export const view = computed<View>(() => {
  if (!availabilityOn.value) {
    return 'standby'
  }
  const items = snapshot.value?.items ?? []
  return items.length > 0 ? 'playing' : 'pairing'
})
