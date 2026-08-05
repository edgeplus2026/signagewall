import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { PlayerSnapshot } from '../types'

interface PlayerDB extends DBSchema {
  state: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'signagewall-player'
const STORE = 'state'
const SNAPSHOT_KEY = 'snapshot'

let dbPromise: Promise<IDBPDatabase<PlayerDB>> | null = null

function getDb(): Promise<IDBPDatabase<PlayerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PlayerDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE)
      },
    })
  }
  return dbPromise
}

/** Persists the last resolved snapshot so the player boots instantly + offline. */
export async function saveSnapshot(snapshot: PlayerSnapshot): Promise<void> {
  try {
    const db = await getDb()
    await db.put(STORE, snapshot, SNAPSHOT_KEY)
  } catch {
    // Persistence is a nicety, never block playback on it.
  }
}

export async function loadSnapshot(): Promise<PlayerSnapshot | null> {
  try {
    const db = await getDb()
    const snapshot = await db.get(STORE, SNAPSHOT_KEY)
    return (snapshot as PlayerSnapshot | undefined) ?? null
  } catch {
    return null
  }
}

export async function clearSnapshot(): Promise<void> {
  try {
    const db = await getDb()
    await db.delete(STORE, SNAPSHOT_KEY)
  } catch {
    // ignore
  }
}

/** Workbox runtime caches that hold downloaded media bytes. */
const MEDIA_CACHE_NAMES = [
  'signagewall-media',
  'signagewall-video',
  'signagewall-private-app-assets',
]

/**
 * Media-cache format generation, bumped whenever a change makes already-cached
 * bytes unusable. Nothing else would ever clear them: the runtime caches are
 * CacheFirst with a 30-day age cap, so a bad entry outlives any number of
 * reloads and app updates.
 *
 * v2 — the video cache no longer accepts opaque responses. Entries written by
 * v1 have unreadable bodies, so the range slicing that every Safari/iOS media
 * request depends on answers them with `416 Range Not Satisfiable`: a black
 * frame and a "video load error", permanently, on any device that cached one.
 */
const MEDIA_CACHE_GENERATION = '2'
const MEDIA_CACHE_GENERATION_KEY = 'signagewall.player.mediaCacheGeneration'

/**
 * Drops the media caches once when they were written in an older, incompatible
 * format, then records the current generation so this is a no-op on every later
 * boot (purging on each one would defeat offline playback entirely). Best
 * effort: a device that cannot read the marker just keeps its cache.
 */
export async function purgeOutdatedMediaCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return
  }
  try {
    if (
      window.localStorage.getItem(MEDIA_CACHE_GENERATION_KEY) ===
      MEDIA_CACHE_GENERATION
    ) {
      return
    }
    await clearMediaCaches()
    window.localStorage.setItem(
      MEDIA_CACHE_GENERATION_KEY,
      MEDIA_CACHE_GENERATION,
    )
  } catch {
    // Storage unavailable — leave the caches alone rather than re-purging on
    // every boot.
  }
}

/**
 * Purges every cached media byte (images + video). Called on revoke so an
 * unpaired display can never resurface a previous screen's content from the SW
 * cache, even offline.
 */
export async function clearMediaCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return
  }
  try {
    await Promise.all(MEDIA_CACHE_NAMES.map((name) => caches.delete(name)))
  } catch {
    // ignore
  }
}
