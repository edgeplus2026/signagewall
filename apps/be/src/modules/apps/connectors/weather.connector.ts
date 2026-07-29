import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
  LocationValue,
} from '@signagewall/apps-contract';
import type {
  WeatherDaily,
  WeatherHour,
  WeatherPayload,
} from '@signagewall/apps';

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
/** Hours kept from the hourly series — a day ahead, and the layouts show ~12. */
const HOURLY_HOURS = 24;
/** `YYYY-MM-DDTHH` — the length that makes an ISO stamp comparable by the hour. */
const HOUR_PREFIX = 13;

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

/** The slice of Open-Meteo's response we ask for. Every field is `?`: it is
 *  somebody else's JSON, and a missing series must degrade, never throw. */
interface OpenMeteoForecast {
  current?: {
    temperature_2m: number;
    apparent_temperature?: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m?: number;
    relative_humidity_2m: number;
    /** 1 by day, 0 by night, at the forecast location. */
    is_day?: number;
    time: string;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
    precipitation_probability?: number[];
    is_day?: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
    uv_index_max?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}

function mapDaily(daily: OpenMeteoForecast['daily']): WeatherDaily[] {
  return (daily?.time ?? []).map((date, index) => {
    const day: WeatherDaily = {
      date,
      weatherCode: daily?.weather_code[index] ?? 0,
      maxC: daily?.temperature_2m_max[index] ?? 0,
      minC: daily?.temperature_2m_min[index] ?? 0,
    };
    const pop = daily?.precipitation_probability_max?.[index];
    if (pop !== undefined && pop !== null) day.precipitationProbability = pop;
    const uv = daily?.uv_index_max?.[index];
    if (uv !== undefined && uv !== null) day.uvIndexMax = uv;
    const sunrise = daily?.sunrise?.[index];
    if (sunrise !== undefined) day.sunrise = sunrise;
    const sunset = daily?.sunset?.[index];
    if (sunset !== undefined) day.sunset = sunset;
    return day;
  });
}

/**
 * The next 24 hours, starting with the one we are in.
 *
 * Upstream hands back the hourly series from LOCAL MIDNIGHT of today — so more
 * than half of a typical response is already in the past, and shipping it whole
 * would put "3am, 12°" on a wall at lunchtime. Both `current.time` and the hourly
 * stamps are local ISO (`timezone=auto`), so trimming to the current hour is a
 * lexicographic compare on the `YYYY-MM-DDTHH` prefix — no Date, no timezone
 * arithmetic on the server, and no assumption that the server shares a clock with
 * the city being forecast.
 */
function mapHourly(
  hourly: OpenMeteoForecast['hourly'],
  currentTime: string,
): WeatherHour[] {
  const times = hourly?.time ?? [];
  if (times.length === 0) return [];

  const currentHour = currentTime.slice(0, HOUR_PREFIX);
  const start = times.findIndex(
    (time) => time.slice(0, HOUR_PREFIX) >= currentHour,
  );
  // A series that ended before "now" is a stale response, not a usable forecast.
  if (start === -1) return [];

  return times.slice(start, start + HOURLY_HOURS).map((time, offset) => {
    const index = start + offset;
    const hour: WeatherHour = {
      time,
      temperatureC: hourly?.temperature_2m?.[index] ?? 0,
      weatherCode: hourly?.weather_code?.[index] ?? 0,
    };
    const pop = hourly?.precipitation_probability?.[index];
    if (pop !== undefined && pop !== null) hour.precipitationProbability = pop;
    const isDay = hourly?.is_day?.[index];
    if (isDay !== undefined) hour.isDay = isDay !== 0;
    return hour;
  });
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
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,is_day` +
        `&hourly=temperature_2m,weather_code,precipitation_probability,is_day` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset` +
        `&forecast_days=${FORECAST_DAYS}&timezone=auto`,
      ctx.signal,
    )) as OpenMeteoForecast;

    if (!forecast.current) {
      throw new Error('weather: no current observation');
    }

    const payload: WeatherPayload = {
      location: place.label,
      temperatureC: forecast.current.temperature_2m,
      weatherCode: forecast.current.weather_code,
      windKph: forecast.current.wind_speed_10m,
      humidity: forecast.current.relative_humidity_2m,
      precipitationProbability:
        forecast.daily?.precipitation_probability_max?.[0] ?? 0,
      daily: mapDaily(forecast.daily),
      observedAt: forecast.current.time,
      // `is_day` is 1/0, and it is about the SKY AT THE PLACE, not about the
      // player's clock — a screen in Belgrade may well be showing Sydney.
      isDay: forecast.current.is_day !== 0,
      hourly: mapHourly(forecast.hourly, forecast.current.time),
    };

    // Optional and only when upstream actually said so: writing `undefined` into
    // an optional field is not the same as leaving it out, and the shared package
    // is built with `exactOptionalPropertyTypes`.
    if (forecast.current.apparent_temperature !== undefined) {
      payload.feelsLikeC = forecast.current.apparent_temperature;
    }
    if (forecast.current.wind_direction_10m !== undefined) {
      payload.windDegrees = forecast.current.wind_direction_10m;
    }

    ctx.logger.debug('weather fetched', {
      location: place.label,
      hours: payload.hourly?.length ?? 0,
    });
    return { playerPayload: payload };
  },
};
