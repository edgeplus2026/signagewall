/**
 * Normalized electricity spot-price payload — the shared contract between the
 * backend `power-prices` connector (Energinet's open Elspotprices dataset) and
 * the embed bundle.
 *
 * BOTH currencies (DKK and EUR, per kWh) travel in each hour so the cache key
 * can stay area-only: instances for the same price area that display different
 * currencies share one fetch. `currentIndex` is resolved server-side from UTC
 * (the server knows "now" unambiguously); the bundle highlights that hour.
 */
export interface PowerPricesPayload {
  /** Price area, e.g. "DK1". */
  area: string
  /** Index into `hours` of the hour containing "now", or -1 if out of range. */
  currentIndex: number
  /** Hourly prices, ascending by time. */
  hours: PowerHour[]
  /** ISO start of the latest known hour — freshness that changes with the data. */
  observedAt: string
}

export interface PowerHour {
  /** Local (Danish) ISO hour start, e.g. "2026-07-14T15:00:00". */
  start: string
  /** Spot price in DKK per kWh, if available. */
  dkk?: number
  /** Spot price in EUR per kWh, if available. */
  eur?: number
}
