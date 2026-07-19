/**
 * Normalized sun payload — the contract between the backend `sunmoon` connector
 * (Open-Meteo) and the embed bundle. Times are the PLACE's local ISO strings
 * (Open-Meteo `timezone=auto`), so a screen shows the sun for the city it names,
 * not for wherever the player happens to sit. The moon phase is not here — it is
 * the same worldwide at a given instant, so the bundle computes it from the clock.
 *
 * `observedAt` is the date these times are for (changes once a day), so an
 * unchanged day never fans out.
 */
export interface SunMoonPayload {
  /** Resolved place label. */
  location: string
  /** Local ISO of sunrise, e.g. "2026-07-16T04:48". */
  sunrise: string
  /** Local ISO of sunset. */
  sunset: string
  /** Length of daylight in seconds. */
  daylightSeconds: number
  /** ISO date (`YYYY-MM-DD`) the times are for. */
  observedAt: string
}
