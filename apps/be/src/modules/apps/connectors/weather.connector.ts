import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { WeatherDaily, WeatherPayload } from '@edge/apps';

interface WeatherConfig {
  location?: string;
  // `units` is display-only; the bundle formats. Not part of the cacheKey.
  units?: string;
}

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/** Normalize a city name for use in the (coarse, shared) cache key. */
function normalizeLocation(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/\s+/g, '-');
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

/**
 * Weather connector backed by Open-Meteo (no API key, no rate limit). The cache
 * key is the normalized city name, so every instance for the same city shares a
 * single geocode + forecast fetch. Returns neutral data (°C, raw numbers); the
 * embed bundle converts to the instance's display units.
 */
export const weatherConnector: AppConnector<WeatherConfig, WeatherPayload> = {
  cacheKey(config) {
    return `weather:${normalizeLocation(config.location ?? '')}`;
  },

  async fetchData(
    config: WeatherConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<WeatherPayload>> {
    const location = (config.location ?? '').trim();
    if (!location) {
      throw new Error('weather: missing location');
    }

    const geo = (await fetchJson(
      `${GEOCODE_URL}?name=${encodeURIComponent(location)}&count=1`,
      ctx.signal,
    )) as {
      results?: Array<{ latitude: number; longitude: number; name: string }>;
    };

    const place = geo.results?.[0];
    if (!place) {
      throw new Error(`weather: location not found: ${location}`);
    }

    const forecast = (await fetchJson(
      `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
        `&current=temperature_2m,weather_code,wind_speed_10m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto`,
      ctx.signal,
    )) as {
      current?: {
        temperature_2m: number;
        weather_code: number;
        wind_speed_10m: number;
        time: string;
      };
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
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
      location: place.name,
      temperatureC: forecast.current.temperature_2m,
      weatherCode: forecast.current.weather_code,
      windKph: forecast.current.wind_speed_10m,
      daily,
      observedAt: forecast.current.time,
    };

    ctx.logger.debug('weather fetched', { location: place.name });
    return { playerPayload: payload };
  },
};
