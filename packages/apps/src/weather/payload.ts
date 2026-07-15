/**
 * Normalized weather payload — the shared contract between the backend `weather`
 * connector (which produces it) and the embed bundle (which renders it). Values
 * are neutral/raw: temperatures in °C, so a coarse `cacheKey` (location only) is
 * shared across instances regardless of their display units; the bundle converts
 * to °F when the instance config asks for imperial.
 *
 * EVERYTHING ADDED AFTER v1 IS OPTIONAL, and that is not tidiness — it is the
 * offline path. A player's snapshot caches the last payload it was given, so a
 * screen that has been off the network since before a connector shipped is still
 * rendering a payload of the older shape. A template that reads `data.hourly[0]`
 * without checking is a template that renders a blank wall on exactly the screens
 * that can't tell anyone about it. Guard, or fall back to a layout that doesn't
 * need the field.
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

  /**
   * Whether it is daylight AT THE PLACE — not at the player.
   *
   * A screen in a shop window shows the weather for a city that may be in another
   * timezone, and even when it isn't, the player's own clock is not evidence about
   * the sky. This is what picks the moon over the sun and the night palette over
   * the day one, and getting it from the payload is the only way it is ever right.
   */
  isDay?: boolean
  /** Apparent ("feels like") temperature in °C. */
  feelsLikeC?: number
  /** Wind direction in degrees (0 = from the north, 90 = from the east). */
  windDegrees?: number
  /**
   * The upcoming hours (up to 24), starting with the current one. Empty on a
   * payload cached before the connector fetched hourly data.
   */
  hourly?: WeatherHour[]
}

export interface WeatherDaily {
  /** ISO date (YYYY-MM-DD). */
  date: string
  minC: number
  maxC: number
  weatherCode: number
  /** Chance of precipitation (%) across the day. */
  precipitationProbability?: number
  /** Peak UV index for the day. */
  uvIndexMax?: number
  /** Local ISO timestamps, e.g. `2026-07-14T05:12`. */
  sunrise?: string
  sunset?: string
}

export interface WeatherHour {
  /** Local ISO timestamp on the hour, e.g. `2026-07-14T15:00`. */
  time: string
  temperatureC: number
  weatherCode: number
  precipitationProbability?: number
  /** Daylight at the place at that hour — the icon needs it as much as `now` does. */
  isDay?: boolean
}
