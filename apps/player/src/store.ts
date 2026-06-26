import { signal, computed } from '@preact/signals'

import { getCachedPairingCode, getStoredVolume } from './device'
import type {
  ConnectionState,
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

/** Diagnostics: id of the renderable currently on screen. */
export const playingItemId = signal<string | null>(null)

/** Most recent non-fatal playback/runtime error, surfaced in diagnostics. */
export const lastError = signal<string | null>(null)

export type View = 'pairing' | 'playing'

/**
 * What the shell should render. We play whenever there is content; otherwise we
 * fall back to the branded pairing/splash screen — whether unpaired (showing a
 * code) or paired-but-empty (showing the splash, never black).
 */
export const view = computed<View>(() => {
  const items = snapshot.value?.items ?? []
  return items.length > 0 ? 'playing' : 'pairing'
})
