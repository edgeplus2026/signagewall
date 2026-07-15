/**
 * Normalized air-quality payload — the shared contract between the backend
 * `airquality` connector (Open-Meteo Air Quality API) and the embed bundle.
 *
 * BOTH indices travel in the payload so the coarse cache key can stay
 * location-only: instances at the same place that show different scales
 * (European vs US AQI) share one fetch, and the bundle picks which to display.
 * `observedAt` is the upstream observation time (hourly), so it changes with the
 * data, not with the fetch.
 */
export interface AirQualityPayload {
  /** Resolved place label. */
  location: string
  /** ISO timestamp of the upstream observation. */
  observedAt: string
  /** European AQI (EAQI), if upstream returned it. */
  europeanAqi?: number
  /** US AQI, if upstream returned it. */
  usAqi?: number
  /** PM2.5 concentration (µg/m³). */
  pm25?: number
  /** PM10 concentration (µg/m³). */
  pm10?: number
  /** Ozone (µg/m³). */
  o3?: number
  /** Nitrogen dioxide (µg/m³). */
  no2?: number
  /** Sulphur dioxide (µg/m³). */
  so2?: number
}
