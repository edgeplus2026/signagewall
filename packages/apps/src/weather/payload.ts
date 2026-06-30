/**
 * Normalized weather payload — the shared contract between the backend `weather`
 * connector (which produces it) and the embed bundle (which renders it). Values
 * are neutral/raw: temperatures in °C, so a coarse `cacheKey` (location only) is
 * shared across instances regardless of their display units; the bundle converts
 * to °F when the instance config asks for imperial.
 */
export interface WeatherPayload {
  /** Resolved place label, e.g. "Belgrade". */
  location: string
  /** Current temperature in °C. */
  temperatureC: number
  /** WMO weather code (mapped to an icon/label by the bundle). */
  weatherCode: number
  /** Wind speed in km/h. */
  windKph: number
  /** Relative humidity (%), current. */
  humidity: number
  /** Precipitation probability (%) for today. */
  precipitationProbability: number
  /** Daily forecast for the upcoming days (up to 6). */
  daily: WeatherDaily[]
  /** ISO timestamp of the upstream observation. */
  observedAt: string
}

export interface WeatherDaily {
  /** ISO date (YYYY-MM-DD). */
  date: string
  minC: number
  maxC: number
  weatherCode: number
}
