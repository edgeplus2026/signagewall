import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
  LocationValue,
} from '@edge/apps-contract';
import type { WeatherDaily, WeatherPayload } from '@edge/apps';

interface WeatherConfig {
  /** A resolved place (lat/lng + label) or a legacy city string to geocode. */
  location?: LocationValue | string;
  // `units`/`language` are display-only (the bundle formats); not in the cacheKey.
  units?: string;
  language?: string;
}

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
/** Days requested upstream (the bundle always shows the upcoming six). */
const FORECAST_DAYS = 7;

/** Normalize a city name for use in the (coarse, shared) cache key. */
function normalizeLocation(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/\s+/g, '-');
}

/** Read a location config as coordinates, a label, and/or a geocode query. */
function parseLocation(value: WeatherConfig['location']): {
  lat?: number;
  lng?: number;
  label?: string;
  query?: string;
} {
  if (value && typeof value === 'object') {
    return { lat: value.lat, lng: value.lng, label: value.label };
  }
  const query = (value ?? '').trim();
  return query ? { query } : {};
}

async function fetchJson(
  url: string,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  const response = await fetch(url, signal ? { signal } : {});
  if (!response.ok) {
    throw new Error(`weather upstream ${response.status}`);
  }
  return response.json();
}

/** Resolve a free-text city to coordinates + a display name via Open-Meteo. */
async function geocode(
  query: string,
  signal: AbortSignal | undefined,
): Promise<{ lat: number; lng: number; label: string }> {
  const geo = (await fetchJson(
    `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=1`,
    signal,
  )) as {
    results?: Array<{ latitude: number; longitude: number; name: string }>;
  };
  const place = geo.results?.[0];
  if (!place) {
    throw new Error(`weather: location not found: ${query}`);
  }
  return { lat: place.latitude, lng: place.longitude, label: place.name };
}

/**
 * Weather connector backed by Open-Meteo (no API key, no rate limit). The cache
 * key is the rounded coordinate (or normalized city name), so every instance for
 * the same place shares a single forecast fetch. Returns neutral data (°C + raw
 * numbers); the embed bundle formats it per the instance config (units/language).
 */
export const weatherConnector: AppConnector<WeatherConfig, WeatherPayload> = {
  cacheKey(config) {
    const loc = parseLocation(config.location);
    if (loc.lat !== undefined && loc.lng !== undefined) {
      // ~1km buckets so the same picked place always shares one fetch.
      return `weather:${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`;
    }
    return `weather:${normalizeLocation(loc.query ?? '')}`;
  },

  async fetchData(
    config: WeatherConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<WeatherPayload>> {
    const loc = parseLocation(config.location);
    if (loc.lat === undefined && !loc.query) {
      throw new Error('weather: missing location');
    }

    // Coordinates come straight from the picked place; a legacy string is geocoded.
    const place =
      loc.lat !== undefined && loc.lng !== undefined
        ? { lat: loc.lat, lng: loc.lng, label: loc.label ?? '' }
        : await geocode(loc.query ?? '', ctx.signal);

    const forecast = (await fetchJson(
      `${FORECAST_URL}?latitude=${place.lat}&longitude=${place.lng}` +
        `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&forecast_days=${FORECAST_DAYS}&timezone=auto`,
      ctx.signal,
    )) as {
      current?: {
        temperature_2m: number;
        weather_code: number;
        wind_speed_10m: number;
        relative_humidity_2m: number;
        time: string;
      };
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max?: number[];
      };
    };

    if (!forecast.current) {
      throw new Error('weather: no current observation');
    }

    const daily: WeatherDaily[] = (forecast.daily?.time ?? []).map(
      (date, index) => ({
        date,
        weatherCode: forecast.daily?.weather_code[index] ?? 0,
        maxC: forecast.daily?.temperature_2m_max[index] ?? 0,
        minC: forecast.daily?.temperature_2m_min[index] ?? 0,
      }),
    );

    const payload: WeatherPayload = {
      location: place.label,
      temperatureC: forecast.current.temperature_2m,
      weatherCode: forecast.current.weather_code,
      windKph: forecast.current.wind_speed_10m,
      humidity: forecast.current.relative_humidity_2m,
      precipitationProbability:
        forecast.daily?.precipitation_probability_max?.[0] ?? 0,
      daily,
      observedAt: forecast.current.time,
    };

    ctx.logger.debug('weather fetched', { location: place.label });
    return { playerPayload: payload };
  },
};
