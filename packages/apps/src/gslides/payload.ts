/**
 * Normalized Google Slides payload — the contract between the backend `gslides`
 * connector and the embed bundle. `slides` are per-page thumbnail image URLs
 * exported from the Slides API.
 *
 * Those URLs are TEMPORARY (Google expires them after ~30 min), so unlike most
 * connectors this one deliberately has NO stable `version`: the rotating URLs
 * make the payload differ every refresh, which re-pushes fresh URLs to the
 * screen well before the old ones expire. The refresh cadence is the freshness
 * guarantee here.
 */
export interface GslidesPayload {
  /** Presentation title, for reference/debugging (the embed shows the slides). */
  title: string
  /** Per-slide thumbnail image URLs, in order. */
  slides: string[]
}
