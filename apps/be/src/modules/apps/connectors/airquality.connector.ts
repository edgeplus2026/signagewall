import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
  LocationValue,
} from '@signagewall/apps-contract';
import type { AirQualityPayload } from '@signagewall/apps';

interface AirQualityConfig {
  /** A resolved place (lat/lng + label) or a legacy city string to geocode. */
  location?: LocationValue | string;
  // `scale` is display-only (the bundle picks the index); not in the cacheKey.
  scale?: string;
}

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Normalize a city name for the coarse, shared cache key. */
function normalizeLocation(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
}

/** Read a location config as coordinates, a label, and/or a geocode query. */
function parseLocation(value: AirQualityConfig['location']): {
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
    throw new Error(`air quality upstream ${response.status}`);
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
    throw new Error(`air quality: location not found: ${query}`);
  }
  return { lat: place.latitude, lng: place.longitude, label: place.name };
}

/** The slice of the Open-Meteo AQ response we ask for; every field degrades. */
interface AirQualityResponse {
  current?: {
    time: string;
    european_aqi?: number;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
  };
}

/**
 * Air-quality connector (`server`). Coarse, location-only cache key (~1km
 * buckets), so every instance for the same place shares one fetch regardless of
 * which index it displays. Fetches both the European and US AQI plus the main
 * pollutants; the bundle chooses what to show. No fetch timestamp — the upstream
 * observation time carries freshness, so unchanged air doesn't fan out.
 */
export const airqualityConnector: AppConnector<
  AirQualityConfig,
  AirQualityPayload
> = {
  cacheKey(config) {
    const loc = parseLocation(config.location);
    if (loc.lat !== undefined && loc.lng !== undefined) {
      return `aq:${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`;
    }
    return `aq:${normalizeLocation(loc.query ?? '')}`;
  },

  async fetchData(
    config: AirQualityConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<AirQualityPayload>> {
    const loc = parseLocation(config.location);
    if (loc.lat === undefined && !loc.query) {
      throw new Error('air quality: missing location');
    }

    const place =
      loc.lat !== undefined && loc.lng !== undefined
        ? { lat: loc.lat, lng: loc.lng, label: loc.label ?? '' }
        : await geocode(loc.query ?? '', ctx.signal);

    const data = (await fetchJson(
      `${AIR_QUALITY_URL}?latitude=${place.lat}&longitude=${place.lng}` +
        `&current=european_aqi,us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide` +
        `&timezone=auto`,
      ctx.signal,
    )) as AirQualityResponse;

    const current = data.current;
    if (!current) {
      throw new Error('air quality: no current observation');
    }

    // Assign each optional only when upstream sent a number, so a missing series
    // is left out rather than written as `undefined` (the package builds with
    // exactOptionalPropertyTypes). Same pattern as the weather connector.
    const payload: AirQualityPayload = {
      location: place.label,
      observedAt: current.time,
    };
    if (typeof current.european_aqi === 'number')
      payload.europeanAqi = current.european_aqi;
    if (typeof current.us_aqi === 'number') payload.usAqi = current.us_aqi;
    if (typeof current.pm2_5 === 'number') payload.pm25 = current.pm2_5;
    if (typeof current.pm10 === 'number') payload.pm10 = current.pm10;
    if (typeof current.ozone === 'number') payload.o3 = current.ozone;
    if (typeof current.nitrogen_dioxide === 'number')
      payload.no2 = current.nitrogen_dioxide;
    if (typeof current.sulphur_dioxide === 'number')
      payload.so2 = current.sulphur_dioxide;

    ctx.logger.debug('air quality fetched', { location: place.label });
    return { playerPayload: payload };
  },
};
