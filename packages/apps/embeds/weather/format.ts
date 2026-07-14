import type { AppDataMeta } from '../_shared/host-bridge.js'
import type { Strings } from './i18n.js'

/** Escape text for interpolation into HTML. */
export function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

/**
 * A temperature, rounded, with the degree sign but no unit letter.
 *
 * Signage shows one place in one unit, so the "C" earns nothing — nobody is
 * comparing this screen against a Fahrenheit one. `Math.round` on the converted
 * value, never on the Celsius: rounding first and converting after turns 21.4°C
 * into 70°F instead of 71°F.
 */
export function tempLabel(celsius: number, imperial: boolean): string {
  const value = imperial ? celsius * 1.8 + 32 : celsius
  return `${Math.round(value)}°`
}

/** The unit itself, for the one or two layouts that spell it out. */
export function unitLabel(imperial: boolean): string {
  return imperial ? '°F' : '°C'
}

export function windLabel(kph: number, imperial: boolean): string {
  return imperial ? `${Math.round(kph * 0.621)} mph` : `${Math.round(kph)} km/h`
}

export function percent(value: number): string {
  return `${Math.round(value)}%`
}

/** The compass point wind is blowing FROM, e.g. 200° → "SW". */
export function compassPoint(degrees: number, strings: Strings): string {
  const index = Math.round(degrees / 45) % 8
  return strings.compass[index] ?? ''
}

/**
 * A local-ISO stamp from the payload as a `Date`.
 *
 * The payload's times (`observedAt`, `sunrise`, an hour's `time`) carry NO zone —
 * they are already the wall clock AT THE FORECAST PLACE, because the connector
 * asks upstream for `timezone=auto`. Parsing a zoneless stamp interprets it in the
 * player's zone, and formatting it back reads it in the player's zone too, so the
 * two cancel and the wall time survives the round trip. That is the whole trick:
 * a screen in Belgrade showing Sydney's forecast prints Sydney's sunrise, not the
 * hour it happens to be in Belgrade when the sun comes up there.
 *
 * It also means the resulting `Date` is a LIE as an instant — never subtract one
 * of these from `Date.now()`. {@link placeNow} is the supported way to ask what
 * time it is where the weather is.
 */
export function parseLocal(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** `15:04` — 24-hour, like the rest of the chrome. */
export function timeLabel(iso: string): string {
  const date = parseLocal(iso)
  if (!date) {
    return ''
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

/**
 * `15` — just the hour, for the ribbon.
 *
 * 24-hour regardless of locale, and that is a signage decision, not an oversight:
 * a strip of twelve "3 PM / 4 PM / 5 PM" is twice as wide and read from six metres
 * away it is the digits that carry, not the marker.
 */
export function hourLabel(iso: string): string {
  const date = parseLocal(iso)
  if (!date) {
    return ''
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

/** `Today`, then `Tue`, `Wed`… in the instance's language. */
export function dayLabel(
  date: string,
  index: number,
  locale: string,
  today: string,
): string {
  if (index === 0) {
    return today
  }
  const parsed = parseLocal(`${date}T00:00:00`)
  if (!parsed) {
    return ''
  }
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(parsed)
}

/** `Tuesday 15 July`, for the layouts with room to say it properly. */
export function longDateLabel(date: string, locale: string): string {
  const parsed = parseLocal(`${date}T00:00:00`)
  if (!parsed) {
    return ''
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parsed)
}

/** `4h 20m` / `35m` — a span of daylight, never a negative one. */
export function durationLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`
}

/**
 * What time it is WHERE THE WEATHER IS — as a `Date` in the same zoneless frame
 * as {@link parseLocal}, so it can be compared against `sunrise` / an hour's
 * `time` directly.
 *
 * `observedAt` is the place's wall clock at the moment upstream was read, and
 * `meta.fetchedAt` is that same moment as a real instant. Together they pin the
 * place's clock to ours: add however long ago that fetch was to the wall time it
 * recorded. Without `meta` we fall back to the raw observation, which trails by at
 * most one refresh (15 minutes) — visible on a sun arc, and still far better than
 * substituting the player's own clock, which for a foreign city is simply another
 * city's time.
 */
export function placeNow(observedAt: string, meta: AppDataMeta | null): Date {
  const observed = parseLocal(observedAt)
  if (!observed) {
    return new Date()
  }
  const fetchedAt = meta?.fetchedAt
  if (fetchedAt === undefined) {
    return observed
  }
  const fetched = new Date(fetchedAt).getTime()
  if (Number.isNaN(fetched)) {
    return observed
  }
  const elapsed = Math.max(0, Date.now() - fetched)
  return new Date(observed.getTime() + elapsed)
}
