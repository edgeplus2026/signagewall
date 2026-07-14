/**
 * Normalized Google Calendar payload — shared contract between the backend
 * `gcal` connector and the embed bundle. Times are ISO 8601 (with offset); the
 * bundle formats per locale. Fetched per-connection (private), so the cacheKey
 * includes the connection id.
 *
 * NO TIMESTAMP IN HERE, and that is load-bearing rather than tidy. The host decides
 * whether to push a refresh to every player by DEEP-COMPARING this object against
 * the last one, so a `fetchedAt` would make a calendar that nobody has touched look
 * changed on every single fetch — and every screen showing it would be rebuilt,
 * mid-animation, every five minutes, for nothing. (This payload carried exactly that
 * field, and did exactly that.) A connector that genuinely has a cheap identity for
 * its data returns a `version` instead and the host compares THAT; the age of the
 * data reaches the player out-of-band, in the `meta` the host sends alongside — see
 * `AppDataMeta`. The same note is on `RssPayload`, which learned it first.
 */
export interface GcalPayload {
  calendarLabel: string
  events: GcalEvent[]
}

export interface GcalEvent {
  title: string
  /** ISO start; for all-day events this is a date (no time). */
  start: string
  /** ISO end, when provided. */
  end?: string
  allDay: boolean
  location?: string
}
