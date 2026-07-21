/**
 * Normalized electricity spot-price payload — the shared contract between the
 * backend `power-prices` connector (energy-charts.info day-ahead prices) and the
 * embed bundle.
 *
 * Prices are day-ahead spot, in EUR per kWh. The connector resolves the area's
 * local day and "now" server-side (from the area's timezone) and hands the embed
 * a ready hourly curve — the embed only formats and draws it.
 */
export interface PowerPricesPayload {
  /** Price-area code, e.g. "RS", "DE-LU". */
  area: string
  /** Human area name, e.g. "Serbia". */
  areaLabel: string
  /** Index into `hours` of the hour containing "now", or -1 if out of range. */
  currentIndex: number
  /** Today's hourly prices, ascending by local time. */
  hours: PowerHour[]
  /** ISO start of the latest known hour — freshness that changes with the data. */
  observedAt: string
}

export interface PowerHour {
  /** Local ISO hour start in the area's timezone, e.g. "2026-07-14T15:00:00". */
  start: string
  /** Day-ahead spot price in EUR per kWh, if available for the hour. */
  eur?: number
}
