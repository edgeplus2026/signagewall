/**
 * Schedule events use two fixed styles so the calendar, sidebar rows, and the
 * "Events Style" legend all read consistently: content is green, screen-off is
 * gray.
 */
export interface ScheduleColor {
  background: string
  border: string
}

/** Content events (playlist / media). */
export const CONTENT_COLOR: ScheduleColor = {
  background: '#dcfce7',
  border: '#16a34a',
}

/** "Turn screen off" events. */
export const SCREEN_OFF_COLOR: ScheduleColor = {
  background: '#e5e7eb',
  border: '#6b7280',
}
