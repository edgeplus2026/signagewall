const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['week', 1000 * 60 * 60 * 24 * 7],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
]

/** Locale-aware relative time (e.g. "2 hours ago"), used in the inbox list. */
export function formatRelativeTime(iso: string, lang: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diffMs) >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit)
    }
  }
  return rtf.format(0, 'minute')
}

/** Locale-aware absolute date + time, used in the notification sheet. */
export function formatDateTime(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

/** Whether an (optional) expiry timestamp is in the past. */
export function isExpired(iso: string | null | undefined): boolean {
  return iso != null && new Date(iso).getTime() <= Date.now()
}
