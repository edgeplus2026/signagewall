/**
 * Normalized public-holidays payload — the shared contract between the backend
 * `holidays` connector (Nager.Date) and the embed bundle. Upcoming holidays,
 * soonest first. No fetch timestamp: the list only changes as holidays pass or a
 * new year publishes, so an unchanged list never fans out.
 */
export interface HolidaysPayload {
  /** ISO-3166 alpha-2 country code, e.g. "DK". */
  country: string
  holidays: Holiday[]
}

export interface Holiday {
  /** ISO date `YYYY-MM-DD`. */
  date: string
  /** English name, e.g. "Christmas Day". */
  name: string
  /** Local-language name, e.g. "Juledag". */
  localName: string
}
