/** Small wall-clock date/time helpers. All strings are timezone-naive. */

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 'YYYY-MM-DD' for a local Date. */
export function formatDate(date: Date): string {
  return `${String(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Local midnight Date for a 'YYYY-MM-DD' string. */
export function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

export function addDays(date: string, days: number): string {
  const parsed = parseDate(date)
  parsed.setDate(parsed.getDate() + days)
  return formatDate(parsed)
}

export function dayBefore(date: string): string {
  return addDays(date, -1)
}

/** Composes a timezone-naive ISO string FullCalendar reads as wall-clock. */
export function composeLocal(date: string, time: string): string {
  return `${date}T${time}:00`
}

/** Splits a FullCalendar local date string into date + 'HH:mm'. */
export function splitLocal(iso: string): { date: string; time: string } {
  if (iso.includes('T')) {
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
  }
  return { date: iso.slice(0, 10), time: '00:00' }
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

export function formatTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`
}

/** Window length in minutes, supporting overnight (end <= start ⇒ next day). */
export function durationMinutes(startTime: string, endTime: string): number {
  const diff = (minutesOf(endTime) - minutesOf(startTime) + 1440) % 1440
  return diff === 0 ? 1440 : diff
}

const RRULE_WEEKDAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const

/** rrule weekday code ('mo'..'su') for a 'YYYY-MM-DD' date. */
export function weekdayCode(date: string): string {
  return RRULE_WEEKDAYS[parseDate(date).getDay()] ?? 'mo'
}
