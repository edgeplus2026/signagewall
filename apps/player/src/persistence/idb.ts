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

/**
 * Proof-of-play state, kept in the same store as the snapshot.
 *
 * Deliberately a plain key rather than its own object store: a new store means a
 * schema version bump, and a version bump on a device that then rolls back to an
 * older bundle leaves IndexedDB refusing to open at all — which would cost the
 * screen its offline snapshot too. A key costs nothing and cannot do that.
 */
const PLAYBACK_KEY = 'playback'

/** What the device is holding: unsent tallies, plus the batch sequence. */
export interface PersistedPlayback {
  tallies: unknown[]
  /** Last batch number this device used. Monotonic; the server dedupes on it. */
  seq: number
  /** Which counter that number belongs to — see `PlaybackBatch.origin`. */
  origin?: string
  /**
   * A batch that went out but was never acknowledged, kept verbatim.
   *
   * Stored so a device that loses power mid-delivery re-sends the SAME batch
   * under the SAME number instead of assembling a fresh one. The server may
   * already have written it; only an identical repeat lets it recognise that and
   * refuse to count it twice. Shape-checked on the way back in, never trusted.
   */
  pending?: unknown
}

export async function savePlayback(state: PersistedPlayback): Promise<void> {
  try {
    const db = await getDb()
    await db.put(STORE, state, PLAYBACK_KEY)
  } catch {
    // A full or unavailable store must never stop playback. The tallies stay in
    // memory and the next flush still sends them; only a reload would lose them.
  }
}

export async function loadPlayback(): Promise<PersistedPlayback | null> {
  try {
    const db = await getDb()
    const saved = (await db.get(STORE, PLAYBACK_KEY)) as
      | Partial<PersistedPlayback>
      | undefined
    if (!saved || !Array.isArray(saved.tallies)) {
      return null
    }
    return {
      tallies: saved.tallies,
      seq: typeof saved.seq === 'number' && saved.seq >= 0 ? saved.seq : 0,
      origin: typeof saved.origin === 'string' ? saved.origin : undefined,
      pending: saved.pending,
    }
  } catch {
    return null
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
 *
 * v3 — the image cache no longer accepts them either. An opaque entry there is
 * readable enough for the <img> that wrote it, but the prefetch reads the same
 * cache in `cors` mode, and that pairing is a network error by spec. Devices
 * that cached one keep failing every prefetch pass for that image until the
 * entry is gone, and nothing else would remove it.
 *
 * v4 — the video cache dropped Workbox's `rangeRequests` plugin (see
 * `vite.config.ts`). Video IS still cached; what changed is how it is served
 * back. Entries written by v3 are byte-perfect and were still unusable: sliced
 * into a synthetic 206 they decoded to nothing, and a device holding one skipped
 * every video it owned. They are inert once the plugin is gone, but they are also
 * tens of megabytes of storage bought for nothing, so v4 clears them once.
 */
const MEDIA_CACHE_GENERATION = '4'
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
