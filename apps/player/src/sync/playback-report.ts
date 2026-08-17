import type { PlaybackBatch } from '@signagewall/player-contract'

import { loadPlayback, savePlayback } from '../persistence/idb'
import {
  clearTallies,
  peekTallies,
  restoreTallies,
  type PlaybackTally,
} from './playback-log'

/**
 * Gets the device's play tallies to the backend, and does not let go of them
 * until it is sure they arrived.
 *
 * This is the one device→server message that is evidence rather than telemetry.
 * A heartbeat that is lost costs nothing; a batch of plays that is lost is a hole
 * in a report somebody bills against. So it is the only one that is acknowledged,
 * persisted before it is sent, and retried with the SAME batch number so the
 * server can recognise a repeat instead of counting it twice.
 */

/** How often a batch goes out. Matches the design's five-minute cadence. */
const FLUSH_INTERVAL_MS = 5 * 60 * 1000

/**
 * How long to wait for the acknowledgement.
 *
 * Generous, because the alternative is worse: giving up early makes the device
 * re-send a batch the server is still writing, and every retry is another chance
 * for the two to disagree. The batch is safe on disk throughout, so waiting costs
 * nothing.
 */
const ACK_TIMEOUT_MS = 20_000

/** Sends one batch and resolves true only on a real acknowledgement. */
export type PlaybackSender = (batch: PlaybackBatch) => Promise<boolean>

let sender: PlaybackSender | null = null
let seq = 0
/**
 * Identity of the current counter, minted on first use and persisted with it.
 *
 * See {@link PlaybackBatch.origin}: the device id outlives web storage, so a
 * wiped store restarts `seq` at 1 on a screen the server already knows. This is
 * what tells the two apart.
 */
let origin = ''
/**
 * A batch that has been assembled and not yet acknowledged.
 *
 * Held — and persisted — so that every retry is the SAME batch under the SAME
 * number. Re-snapshotting instead would be quietly destructive: a repeat carrying
 * a fresh number gets counted twice, and a repeat carrying the old number but
 * more plays gets dropped as a duplicate, taking the plays that arrived in
 * between with it. Neither is visible in a report; both are wrong.
 */
let pending: PlaybackBatch | null = null
/** True while a batch is out; a second flush would send it twice. */
let inFlight = false
let restored = false

/**
 * Registered by the socket layer, for the same reason the diagnostics sender is:
 * this module and the socket would otherwise import each other. A batch assembled
 * before the socket registers simply waits — it is on disk, and nothing is lost.
 */
export function registerPlaybackSender(next: PlaybackSender): () => void {
  sender = next
  return () => {
    if (sender === next) {
      sender = null
    }
  }
}

/**
 * Reads back what the last session was still holding.
 *
 * Runs before anything is recorded. Without it every nightly reload — and every
 * page recovery the shell performs — would silently drop up to a day of evidence,
 * and the loss would be invisible: the report would just show a smaller number.
 */
export async function restorePlayback(): Promise<void> {
  if (restored) {
    return
  }
  restored = true
  const saved = await loadPlayback()
  if (!saved) {
    return
  }
  seq = saved.seq
  origin = typeof saved.origin === 'string' ? saved.origin : ''
  pending = asBatch(saved.pending)
  restoreTallies(saved.tallies as PlaybackTally[])
}

/**
 * Whether a batch read back off disk is usable.
 *
 * The bundle that wrote it may be older than the one reading it, and a malformed
 * value must cost that batch alone — never the boot. A rejected batch is not lost
 * data: its plays are still in the tallies, which are only cleared on an ack.
 */
function asBatch(value: unknown): PlaybackBatch | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const batch = value as Partial<PlaybackBatch>
  if (typeof batch.seq !== 'number' || !Array.isArray(batch.tallies)) {
    return null
  }
  if (batch.tallies.length === 0 || typeof batch.origin !== 'string') {
    return null
  }
  return {
    seq: batch.seq,
    origin: batch.origin,
    at: batch.at ?? 0,
    tallies: batch.tallies,
  }
}

/**
 * The counter's identity, minted the first time a batch is assembled.
 *
 * `randomUUID` is absent on http:// origins and older WebViews — exactly the
 * devices this is meant to protect — so there is a fallback. It does not need to
 * be unguessable, only different from the last one.
 */
function counterOrigin(): string {
  if (origin) {
    return origin
  }
  origin =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `o${String(Date.now())}-${Math.random().toString(36).slice(2, 10)}`
  return origin
}

/** Writes the tallies, the batch number and any unacknowledged batch down. */
export async function persistPlayback(): Promise<void> {
  await savePlayback({ tallies: peekTallies(), seq, origin, pending })
}

/**
 * Sends everything outstanding, if there is anything and a way to send it.
 *
 * The order is deliberate and is the whole correctness argument:
 *
 *  1. an unacknowledged batch is re-sent unchanged — it is the only thing the
 *     server can recognise as a repeat;
 *  2. otherwise assemble one from a COPY of the tallies, so the plays that land
 *     during the round trip are not swept into this batch;
 *  3. persist the batch BEFORE sending, so a device that dies mid-flight comes
 *     back knowing what it had and which number it used;
 *  4. send, and wait for a real acknowledgement;
 *  5. only then subtract exactly the confirmed plays and persist again.
 *
 * A failure at any point leaves the tallies intact and the batch reserved, so the
 * retry is the same batch and the server can refuse to count it twice.
 */
export async function flushPlayback(): Promise<boolean> {
  if (inFlight || !sender) {
    return false
  }

  const batch = pending ?? assembleBatch()
  if (!batch) {
    return false
  }

  inFlight = true
  try {
    if (pending !== batch) {
      pending = batch
      // The reserved batch goes to disk before the wire: a device that loses
      // power between the two must come back holding this exact batch, or it
      // would assemble a different one and the server could count both.
      await persistPlayback()
    }

    // The timestamp is refreshed on every attempt: the server reads it to measure
    // how far off this device's clock is, and that measurement is only meaningful
    // at the moment of arrival. Dedup keys on `seq`, so this changing is safe.
    const acknowledged = await sender({ ...batch, at: Date.now() })
    if (!acknowledged) {
      return false
    }

    clearTallies(batch.tallies as PlaybackTally[])
    pending = null
    await persistPlayback()
    return true
  } catch {
    // Offline, a dead socket, a backend that refused. Everything is still on
    // disk under the same batch number; the next attempt repeats it exactly.
    return false
  } finally {
    inFlight = false
  }
}

/** Takes the next batch number and a snapshot of the tallies to go with it. */
function assembleBatch(): PlaybackBatch | null {
  const tallies = peekTallies()
  if (tallies.length === 0) {
    return null
  }
  seq += 1
  return {
    seq,
    origin: counterOrigin(),
    at: Date.now(),
    tallies: tallies.map((tally) => ({
      contentId: tally.contentId,
      day: tally.day,
      kind: tally.kind,
      ...(tally.slug ? { slug: tally.slug } : {}),
      plays: tally.plays,
      airtimeMs: tally.airtimeMs,
      hours: tally.hours,
      airtimeHours: tally.airtimeHours,
      firstAt: tally.firstAt,
      lastAt: tally.lastAt,
    })),
  }
}

/** Acknowledgement deadline, exported so the socket layer uses the same number. */
export const PLAYBACK_ACK_TIMEOUT_MS = ACK_TIMEOUT_MS

/**
 * Runs the reporting loop for the life of the player. Returns a disposer.
 *
 * Three triggers, each covering what the others cannot: the interval is the
 * ordinary case; coming back online is what empties a screen that has been away;
 * and `pagehide` is what saves the tally through the nightly reload, which is the
 * one interruption that happens to every screen every day.
 */
export function startPlaybackReporting(): () => void {
  let stopped = false

  const flush = (): void => {
    if (!stopped) {
      void flushPlayback()
    }
  }

  const timer = setInterval(flush, FLUSH_INTERVAL_MS)
  const onOnline = (): void => {
    flush()
  }
  // Not `beforeunload`: mobile WebViews frequently skip it, and this is the hook
  // that has to work on exactly those devices. Persisting only — a send would not
  // survive the teardown, and the next boot restores and sends anyway.
  const onHide = (): void => {
    void persistPlayback()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline)
    window.addEventListener('pagehide', onHide)
  }

  return () => {
    stopped = true
    clearInterval(timer)
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pagehide', onHide)
    }
    void persistPlayback()
  }
}

/** Test seam: fresh module state without reloading the module. */
export function resetPlaybackReportingForTests(): void {
  sender = null
  seq = 0
  origin = ''
  pending = null
  inFlight = false
  restored = false
}
