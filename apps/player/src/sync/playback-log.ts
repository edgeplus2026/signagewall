import type { PlaybackRecord } from '../engine/playback-controller'

/**
 * The device's own tally of what it has played.
 *
 * Proof-of-play is not a stream of events. A screen on a 96-second rotation plays
 * something roughly every twenty seconds, which is a few thousand appearances a
 * day; a fleet of five thousand screens would be twenty million rows a day, and
 * nobody has ever wanted to know the exact second of the eight-thousandth
 * showing. What is wanted is "this ran 1 263 times for fourteen hours" — a sum.
 *
 * So the device sums as it goes and reports totals. That is roughly four hundred
 * times less to send, store and add up, and it is the same answer.
 *
 * The hour of day AND the calendar day are attributed HERE, in the device's own
 * local time, because the device is the only party that knows its timezone. The
 * backend would have to look the zone up to place a play in "the lunchtime hour",
 * and a screen that moved timezone would silently re-file its history.
 *
 * The day matters for a second reason: a screen can be offline across midnight,
 * and its tally then spans two dates. Keying on the day means that split is
 * already made when the batch is assembled, however long the screen was away —
 * whereas a day stamped on arrival would file three days of playback under the
 * afternoon the link came back.
 */

/** One content item's running total for the current batch. */
export interface PlaybackTally {
  contentId: string
  /** Local calendar day, 'YYYY-MM-DD'. The bucket this play belongs to. */
  day: string
  kind: PlaybackRecord['kind']
  slug?: string
  plays: number
  airtimeMs: number
  /** Plays per local hour of day, 0–23. Dayparting comes from this. */
  hours: number[]
  /**
   * Measured airtime per local hour of day, 0–23, in milliseconds.
   *
   * What the coverage report reads. Counting plays per hour cannot answer "how
   * much of that hour had content on screen", and it cannot tell a screen frozen
   * on one item for three hours from one that played it once — which is the
   * failure worth catching, because from outside it looks perfectly healthy.
   */
  airtimeHours: number[]
  /** Device clock; the first and last appearance in this batch. */
  firstAt: number
  lastAt: number
}

/**
 * Distinct content items held before the tally refuses to grow.
 *
 * Not a memory concern — it is a corruption guard. If a bug ever started minting
 * fresh ids, an unbounded map would grow until the tab died, taking the screen
 * with it. A playlist has tens of items; a thousand means something is wrong, and
 * dropping the surplus keeps the screen playing.
 */
const MAX_TRACKED_ITEMS = 1000

/** Keyed by day AND content, so a batch spanning midnight arrives already split. */
const tallies = new Map<string, PlaybackTally>()

/** 'YYYY-MM-DD' in the device's local time — never UTC; see the note above. */
function localDay(at: number): string {
  const d = new Date(at)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${String(d.getFullYear())}-${month}-${day}`
}

function keyOf(day: string, contentId: string): string {
  return `${day}|${contentId}`
}

/** Folds one completed appearance into the running totals. */
export function recordPlay(record: PlaybackRecord): void {
  const airtimeMs = record.endedAt - record.startedAt
  // No lower threshold. An appearance of 300ms because an operator was stepping
  // through with the remote is recorded with its 300ms: the report is free to
  // filter that, but a recorder that invents rules produces evidence nobody can
  // reason about afterwards — and the rule it invented is invisible in the
  // output. Only a non-positive span is refused, and that is a clock stepping
  // backwards, not a measurement.
  if (airtimeMs <= 0) {
    return
  }

  const day = localDay(record.startedAt)
  const key = keyOf(day, record.contentId)
  const existing = tallies.get(key)
  if (!existing && tallies.size >= MAX_TRACKED_ITEMS) {
    return
  }

  const hour = new Date(record.startedAt).getHours()

  if (existing) {
    existing.plays += 1
    existing.airtimeMs += airtimeMs
    existing.hours[hour] = (existing.hours[hour] ?? 0) + 1
    existing.airtimeHours[hour] = (existing.airtimeHours[hour] ?? 0) + airtimeMs
    existing.lastAt = record.endedAt
    return
  }

  const hours = new Array<number>(24).fill(0)
  hours[hour] = 1
  const airtimeHours = new Array<number>(24).fill(0)
  airtimeHours[hour] = airtimeMs
  tallies.set(key, {
    contentId: record.contentId,
    day,
    kind: record.kind,
    ...(record.slug ? { slug: record.slug } : {}),
    plays: 1,
    airtimeMs,
    hours,
    airtimeHours,
    firstAt: record.startedAt,
    lastAt: record.endedAt,
  })
}

/**
 * Everything tallied so far, WITHOUT clearing it.
 *
 * Reading and clearing are separate on purpose: a batch is only safe to forget
 * once the backend has confirmed it, and that answer comes back long after the
 * read. See {@link clearTallies}.
 */
export function peekTallies(): PlaybackTally[] {
  return [...tallies.values()].map((tally) => ({
    ...tally,
    hours: [...tally.hours],
    airtimeHours: [...tally.airtimeHours],
  }))
}

/**
 * Drops exactly the plays that were in a confirmed batch.
 *
 * Subtracts rather than wiping the map, because appearances keep landing while a
 * batch is in flight — clearing wholesale would throw away everything that
 * happened during the round trip, and those are precisely the plays nobody would
 * ever notice were missing.
 */
export function clearTallies(confirmed: PlaybackTally[]): void {
  for (const sent of confirmed) {
    const current = tallies.get(keyOf(sent.day, sent.contentId))
    if (!current) {
      continue
    }
    if (current.plays <= sent.plays) {
      tallies.delete(keyOf(sent.day, sent.contentId))
      continue
    }
    current.plays -= sent.plays
    current.airtimeMs = Math.max(0, current.airtimeMs - sent.airtimeMs)
    for (let hour = 0; hour < 24; hour += 1) {
      current.hours[hour] = Math.max(
        0,
        (current.hours[hour] ?? 0) - (sent.hours[hour] ?? 0),
      )
      current.airtimeHours[hour] = Math.max(
        0,
        (current.airtimeHours[hour] ?? 0) - (sent.airtimeHours[hour] ?? 0),
      )
    }
  }
}

/**
 * Folds a set restored from disk back into the tallies.
 *
 * A screen reloads itself every night and the shell restarts it whenever a page
 * recovers, so tallies that lived only in memory would lose a day's worth of
 * evidence to routine maintenance — and the gap would be invisible, because the
 * report simply shows a smaller number.
 *
 * ADDS rather than replaces, which matters more than it looks. Boot reads the
 * persisted snapshot and the persisted tallies concurrently, so a screen that
 * starts playing before the read comes back can already have recorded an
 * appearance — and a restore that cleared the map first would throw exactly that
 * one away. Adding makes the order irrelevant, which is a better guarantee than
 * a comment promising the race cannot happen.
 */
export function restoreTallies(saved: PlaybackTally[]): void {
  for (const tally of saved) {
    if (!isTally(tally)) {
      continue
    }
    // The same ceiling the live path enforces. Restoring is reading untrusted
    // bytes: a store corrupted into a hundred thousand rows would otherwise walk
    // straight past the guard that exists to keep the tab alive.
    if (tallies.size >= MAX_TRACKED_ITEMS) {
      break
    }
    // Normalise both histograms: a truncated or over-long array from an older
    // build (or a hand-edited store) must not make the arithmetic below throw.
    // A build that predates `airtimeHours` has none at all, and its rows simply
    // report no per-hour airtime rather than failing to restore.
    const hours = Array.from(
      { length: 24 },
      (_, hour) => tally.hours[hour] ?? 0,
    )
    const airtimeHours = Array.from(
      { length: 24 },
      (_, hour) => tally.airtimeHours?.[hour] ?? 0,
    )

    const key = keyOf(tally.day, tally.contentId)
    const existing = tallies.get(key)
    if (!existing) {
      tallies.set(key, { ...tally, hours, airtimeHours })
      continue
    }

    existing.plays += tally.plays
    existing.airtimeMs += tally.airtimeMs
    for (let hour = 0; hour < 24; hour += 1) {
      existing.hours[hour] = (existing.hours[hour] ?? 0) + hours[hour]!
      existing.airtimeHours[hour] =
        (existing.airtimeHours[hour] ?? 0) + airtimeHours[hour]!
    }
    existing.firstAt = Math.min(existing.firstAt, tally.firstAt)
    existing.lastAt = Math.max(existing.lastAt, tally.lastAt)
  }
}

/**
 * Whether a value read back off disk is usable.
 *
 * IndexedDB holds whatever the last build wrote, and a screen updates its web
 * bundle without asking. One malformed row must cost that row, not the boot.
 */
function isTally(value: unknown): value is PlaybackTally {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const t = value as Partial<PlaybackTally>
  return (
    typeof t.contentId === 'string' &&
    typeof t.day === 'string' &&
    typeof t.plays === 'number' &&
    Number.isFinite(t.plays) &&
    typeof t.airtimeMs === 'number' &&
    Number.isFinite(t.airtimeMs) &&
    Array.isArray(t.hours)
  )
}

/** How many distinct items are waiting to be reported. */
export function pendingCount(): number {
  return tallies.size
}

/** Test seam: forget everything, as a fresh boot would. */
export function resetTalliesForTests(): void {
  tallies.clear()
}
