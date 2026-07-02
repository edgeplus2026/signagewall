/**
 * Working-hours (availability) rule + a timezone/DST-aware evaluator, shared by
 * the backend (snapshot producer, later quiet-hours checks) and the player
 * (local standby scheduling) so the two can never drift.
 *
 * The rule is a *standing config* — `always` / `weekly` (recurring) / `special`
 * (date range) — valid until changed, so the player can evaluate it locally and
 * indefinitely while offline. The evaluator uses only native
 * `Intl.DateTimeFormat` (no luxon/rrule) to keep the player bundle free of
 * datetime libraries.
 *
 * Semantics mirror the backend's luxon/rrule `AvailabilityEvaluator` (the CMS
 * display oracle) for every state its write-path validation can store:
 * - Windows are `[start, end)` local wall-clock and never cross midnight;
 *   `end` must be strictly after `start` or that day's window is dropped.
 * - A start/end time that does not exist on a spring-forward day drops that
 *   day's window rather than silently shifting it.
 * - A local time that occurs twice on a fall-back day resolves to the earlier
 *   instant (luxon's default).
 * - `special` is off before `startDate` and off forever after `endDate`.
 * - `weekly` with no enabled (valid) days is off forever.
 *
 * Structurally broken payloads the backend can never emit (unknown mode,
 * invalid IANA timezone, missing `weekly`/`special` block, malformed dates)
 * fail OPEN — treated as always-on with a one-time warning — because a signage
 * device must never black out forever on garbage data.
 */

import { TIME_RE } from './settings.js'

export type AvailabilityMode = 'always' | 'weekly' | 'special'

export type AvailabilityWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

/** Per-weekday on-window. `start`/`end` are local 'HH:mm'. */
export interface AvailabilityWeeklyDay {
  day: AvailabilityWeekday
  enabled: boolean
  start: string
  end: string
}

/** One-off period. Dates are local 'YYYY-MM-DD' (inclusive); times local 'HH:mm'. */
export interface AvailabilitySpecialWindow {
  startDate: string
  endDate: string
  start: string
  end: string
}

/**
 * Wire form of a screen's working-hours rule (config, not transitions). The
 * backend sends only the block matching the active mode; an absent rule means
 * always-on.
 */
export interface AvailabilityRule {
  mode: AvailabilityMode
  /** IANA timezone the windows are local to, e.g. 'Europe/Belgrade'. */
  timezone: string
  weekly?: AvailabilityWeeklyDay[]
  special?: AvailabilitySpecialWindow
}

/** Whether the screen should be on (playing content) at `at`. */
export function isAvailabilityOn(
  rule: AvailabilityRule | undefined,
  at: Date,
): boolean {
  const resolved = resolveRule(rule)
  if (resolved.kind === 'on') {
    return true
  }
  const atMs = at.getTime()
  // Windows never cross midnight, so a covering window can only start on
  // `at`'s own local calendar day.
  const wall = wallClockAt(resolved.fmt, atMs)
  const window = windowForDay(resolved, wall.year, wall.month, wall.day)
  return window !== null && window.startMs <= atMs && atMs < window.endMs
}

/**
 * The next instant the on/off state changes, strictly after `from`. `null`
 * means the state is steady forever: always-on, weekly with no enabled days,
 * or a special range already past its end.
 */
export function nextAvailabilityBoundary(
  rule: AvailabilityRule | undefined,
  from: Date,
): Date | null {
  const resolved = resolveRule(rule)
  if (resolved.kind === 'on') {
    return null
  }
  if (resolved.kind === 'weekly' && resolved.days.size === 0) {
    return null
  }

  const fromMs = from.getTime()
  const today = wallClockAt(resolved.fmt, fromMs)

  // Jump the scan anchor to the special range's first day when it starts in
  // the future — a crawl capped at MAX_SCAN_DAYS would miss a range starting
  // further out.
  let anchor: CalendarDay = today
  if (resolved.kind === 'special') {
    const todayKey = dateKey(today.year, today.month, today.day)
    if (todayKey < resolved.special.startDate) {
      anchor = resolved.startDay
    }
  }

  // Any enabled weekly day recurs within 7 days and a DST gap can drop at most
  // one occurrence in the scan window, so 15 days always suffices; special
  // either yields a window immediately or exits at endDate.
  for (let offset = 0; offset <= MAX_SCAN_DAYS; offset++) {
    const day = addDays(anchor, offset)
    if (resolved.kind === 'special') {
      if (dateKey(day.year, day.month, day.day) > resolved.special.endDate) {
        return null
      }
    }
    const window = windowForDay(resolved, day.year, day.month, day.day)
    if (!window) {
      continue
    }
    if (window.startMs > fromMs) {
      return new Date(window.startMs)
    }
    if (window.endMs > fromMs) {
      return new Date(window.endMs)
    }
  }
  return null
}

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_SCAN_DAYS = 15

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** JS getUTCDay() index (Sun=0..Sat=6) → weekday key. */
const WEEKDAY_BY_JS_DAY: readonly AvailabilityWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

interface CalendarDay {
  year: number
  /** 1-12 */
  month: number
  /** 1-31 */
  day: number
}

interface WallClock extends CalendarDay {
  minuteOfDay: number
  second: number
}

interface AbsoluteWindow {
  startMs: number
  endMs: number
}

type ResolvedRule =
  /** Always-on: mode 'always', absent rule, or a broken payload (fail open). */
  | { kind: 'on' }
  | {
      kind: 'weekly'
      fmt: Intl.DateTimeFormat
      days: Map<AvailabilityWeekday, AvailabilityWeeklyDay>
    }
  | {
      kind: 'special'
      fmt: Intl.DateTimeFormat
      special: AvailabilitySpecialWindow
      /** Parsed `special.startDate`, so the boundary scan need not re-parse it. */
      startDay: CalendarDay
    }

const formatterByZone = new Map<string, Intl.DateTimeFormat | null>()
const warnedKeys = new Set<string>()

function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) {
    return
  }
  warnedKeys.add(key)
  console.warn(`[availability] ${message}`)
}

/** Cached per zone — Intl.DateTimeFormat construction is expensive. */
function zoneFormatter(timezone: string): Intl.DateTimeFormat | null {
  const cached = formatterByZone.get(timezone)
  if (cached !== undefined) {
    return cached
  }
  let fmt: Intl.DateTimeFormat | null = null
  try {
    // 'h23' (not 'h24') so midnight renders as '00', never '24'.
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    fmt = null
  }
  formatterByZone.set(timezone, fmt)
  return fmt
}

function resolveRule(rule: AvailabilityRule | undefined): ResolvedRule {
  if (!rule || rule.mode === 'always') {
    return { kind: 'on' }
  }
  if (rule.mode !== 'weekly' && rule.mode !== 'special') {
    warnOnce(
      `mode:${String(rule.mode)}`,
      `unknown mode '${String(rule.mode)}', treating as always-on`,
    )
    return { kind: 'on' }
  }

  const fmt = zoneFormatter(rule.timezone)
  if (!fmt) {
    warnOnce(
      `tz:${rule.timezone}`,
      `invalid timezone '${rule.timezone}', treating as always-on`,
    )
    return { kind: 'on' }
  }

  if (rule.mode === 'weekly') {
    if (!Array.isArray(rule.weekly)) {
      warnOnce('weekly:missing', 'weekly mode without a weekly array, treating as always-on')
      return { kind: 'on' }
    }
    const days = new Map<AvailabilityWeekday, AvailabilityWeeklyDay>()
    for (const entry of rule.weekly) {
      if (entry.enabled && hasValidTimes(entry.start, entry.end)) {
        days.set(entry.day, entry)
      }
    }
    return { kind: 'weekly', fmt, days }
  }

  const special = rule.special
  const startDay = special ? parseDateParts(special.startDate) : null
  if (!special || startDay === null || parseDateParts(special.endDate) === null) {
    warnOnce(
      'special:invalid',
      'special mode with a missing/malformed block, treating as always-on',
    )
    return { kind: 'on' }
  }
  return { kind: 'special', fmt, special, startDay }
}

/** The day's on-window as absolute instants, or null when off all day. */
function windowForDay(
  resolved: Extract<ResolvedRule, { kind: 'weekly' | 'special' }>,
  year: number,
  month: number,
  day: number,
): AbsoluteWindow | null {
  if (resolved.kind === 'weekly') {
    const weekday =
      WEEKDAY_BY_JS_DAY[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
    const config = weekday === undefined ? undefined : resolved.days.get(weekday)
    if (!config) {
      return null
    }
    return buildWindow(resolved.fmt, year, month, day, config.start, config.end)
  }

  const key = dateKey(year, month, day)
  const { special } = resolved
  // Zero-padded ISO dates compare correctly as strings.
  if (key < special.startDate || key > special.endDate) {
    return null
  }
  return buildWindow(resolved.fmt, year, month, day, special.start, special.end)
}

/**
 * Builds the absolute `[start, end)` window for a local day. Null when the
 * times are malformed, reversed, or fall into a DST gap — that day is off.
 */
function buildWindow(
  fmt: Intl.DateTimeFormat,
  year: number,
  month: number,
  day: number,
  startHHmm: string,
  endHHmm: string,
): AbsoluteWindow | null {
  const startMin = parseMinutes(startHHmm)
  const endMin = parseMinutes(endHHmm)
  if (startMin === null || endMin === null || endMin <= startMin) {
    return null
  }
  const startMs = wallClockToInstant(fmt, year, month, day, startMin)
  const endMs = wallClockToInstant(fmt, year, month, day, endMin)
  if (startMs === null || endMs === null || endMs <= startMs) {
    return null
  }
  return { startMs, endMs }
}

/**
 * Resolves a local wall-clock (calendar day + minute-of-day) to an absolute
 * instant via offset correction: probe the zone's offset around the target,
 * derive a candidate instant from each, and keep those that round-trip to
 * exactly the requested wall-clock. No candidate ⇒ the local time does not
 * exist (spring-forward gap) ⇒ null. Two candidates (fall-back fold) ⇒ the
 * earlier instant, matching luxon's default on the backend.
 */
function wallClockToInstant(
  fmt: Intl.DateTimeFormat,
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
): number | null {
  const guessMs = Date.UTC(year, month - 1, day, 0, minuteOfDay)
  let best: number | null = null
  // Probing a day either side of the guess samples the offsets on both sides
  // of any DST transition near the target.
  for (const probeMs of [guessMs - DAY_MS, guessMs, guessMs + DAY_MS]) {
    const wall = wallClockAt(fmt, probeMs)
    const offsetMs =
      Date.UTC(wall.year, wall.month - 1, wall.day, 0, wall.minuteOfDay, wall.second) -
      probeMs
    const candidateMs = guessMs - offsetMs
    const roundTrip = wallClockAt(fmt, candidateMs)
    if (
      roundTrip.year === year &&
      roundTrip.month === month &&
      roundTrip.day === day &&
      roundTrip.minuteOfDay === minuteOfDay &&
      (best === null || candidateMs < best)
    ) {
      best = candidateMs
    }
  }
  return best
}

/** Local wall-clock parts of an instant in the formatter's zone. */
function wallClockAt(fmt: Intl.DateTimeFormat, instantMs: number): WallClock {
  let year = 0
  let month = 0
  let day = 0
  let hour = 0
  let minute = 0
  let second = 0
  for (const part of fmt.formatToParts(instantMs)) {
    switch (part.type) {
      case 'year':
        year = Number(part.value)
        break
      case 'month':
        month = Number(part.value)
        break
      case 'day':
        day = Number(part.value)
        break
      case 'hour':
        hour = Number(part.value)
        break
      case 'minute':
        minute = Number(part.value)
        break
      case 'second':
        second = Number(part.value)
        break
    }
  }
  return { year, month, day, minuteOfDay: hour * 60 + minute, second }
}

function hasValidTimes(start: string, end: string): boolean {
  const startMin = parseMinutes(start)
  const endMin = parseMinutes(end)
  return startMin !== null && endMin !== null && endMin > startMin
}

function parseMinutes(value: string): number | null {
  if (typeof value !== 'string' || !TIME_RE.test(value)) {
    return null
  }
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
}

/** Parses 'YYYY-MM-DD' and rejects impossible calendar dates. */
function parseDateParts(value: string): CalendarDay | null {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return null
  }
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

/** Pure calendar arithmetic (Date.UTC normalizes the overflow). */
function addDays(from: CalendarDay, offset: number): CalendarDay {
  const d = new Date(Date.UTC(from.year, from.month - 1, from.day + offset))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

function dateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
