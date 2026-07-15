/**
 * Normalized "on this day" payload — the shared contract between the backend
 * `onthisday` connector (Wikipedia's On This Day feed) and the embed bundle.
 * Events for today's date, most-recent year first. `monthDay` changes once a day
 * (not per fetch), so an unchanged day never fans out.
 */
export interface OnThisDayPayload {
  /** Today's date as `MM-DD` (the day these events are for). */
  monthDay: string
  events: OnThisDayEvent[]
}

export interface OnThisDayEvent {
  /** The year the event happened (may be negative for BCE). */
  year: number
  /** One-line description of the event. */
  text: string
}
