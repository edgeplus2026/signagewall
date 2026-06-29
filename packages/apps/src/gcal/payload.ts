/**
 * Normalized Google Calendar payload — shared contract between the backend
 * `gcal` connector and the embed bundle. Times are ISO 8601 (with offset); the
 * bundle formats per locale. Fetched per-connection (private), so the cacheKey
 * includes the connection id.
 */
export interface GcalPayload {
  calendarLabel: string
  events: GcalEvent[]
  fetchedAt: string
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
