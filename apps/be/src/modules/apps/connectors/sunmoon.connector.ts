import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
  LocationValue,
} from '@edge/apps-contract';
import type { SunMoonPayload } from '@edge/apps';

interface SunMoonConfig {
  /** A resolved place (lat/lng + label) or a legacy city string to geocode. */
  location?: LocationValue | string;
}

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/** Normalize a city name for the coarse, shared cache key. */
function normalizeLocation(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
}

function parseLocation(value: SunMoonConfig['location']): {
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
    throw new Error(`sunmoon upstream ${response.status}`);
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
    throw new Error(`sunmoon: location not found: ${query}`);
  }
  return { lat: place.latitude, lng: place.longitude, label: place.name };
}

interface SunResponse {
  daily?: {
    time?: string[];
    sunrise?: string[];
    sunset?: string[];
    daylight_duration?: number[];
  };
}

/**
 * Sun & Moon connector (`server`). Coarse, location-only cache key (~1km
 * buckets), so every instance for the same place shares one fetch. Returns
 * today's local sunrise/sunset and daylight length; no fetch timestamp — the
 * date carries freshness, so an unchanged day doesn't fan out. The moon phase is
 * computed by the bundle, not here.
 */
export const sunmoonConnector: AppConnector<SunMoonConfig, SunMoonPayload> = {
  cacheKey(config) {
    const loc = parseLocation(config.location);
    if (loc.lat !== undefined && loc.lng !== undefined) {
      return `sun:${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`;
    }
    return `sun:${normalizeLocation(loc.query ?? '')}`;
  },

  async fetchData(
    config: SunMoonConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<SunMoonPayload>> {
    const loc = parseLocation(config.location);
    if (loc.lat === undefined && !loc.query) {
      throw new Error('sunmoon: missing location');
    }

    const place =
      loc.lat !== undefined && loc.lng !== undefined
        ? { lat: loc.lat, lng: loc.lng, label: loc.label ?? '' }
        : await geocode(loc.query ?? '', ctx.signal);

    const data = (await fetchJson(
      `${FORECAST_URL}?latitude=${place.lat}&longitude=${place.lng}` +
        `&daily=sunrise,sunset,daylight_duration&timezone=auto&forecast_days=1`,
      ctx.signal,
    )) as SunResponse;

    const daily = data.daily;
    const sunrise = daily?.sunrise?.[0];
    const sunset = daily?.sunset?.[0];
    if (!sunrise || !sunset) {
      throw new Error('sunmoon: no sun times');
    }

    ctx.logger.debug('sunmoon fetched', { location: place.label });
    return {
      playerPayload: {
        location: place.label,
        sunrise,
        sunset,
        daylightSeconds: daily?.daylight_duration?.[0] ?? 0,
        observedAt: daily?.time?.[0] ?? sunrise.slice(0, 10),
      },
    };
  },
};
