import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { PlayerSnapshot } from '../types'

interface PlayerDB extends DBSchema {
  state: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'edge-player'
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
