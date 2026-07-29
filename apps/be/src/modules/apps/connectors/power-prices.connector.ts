import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import { powerAreaByValue } from '@signagewall/apps';
import type { PowerHour, PowerPricesPayload } from '@signagewall/apps';

interface PowerPricesConfig {
  area?: string;
}

/** energy-charts.info day-ahead prices — keyless, pan-European incl. Serbia. */
const PRICE_API = 'https://api.energy-charts.info/price';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PriceResponse {
  unix_seconds?: number[];
  price?: (number | null)[];
}

/** UTC calendar date (YYYY-MM-DD) for the query window bounds. */
function utcYmd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The area-local date + hour of an instant, honouring the zone's DST. */
function localParts(ms: number, tz: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0; // some engines emit 24 for local midnight
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour };
}

function hourIso(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, '0')}:00:00`;
}

/**
 * One fetch with a single 429 backoff. energy-charts throttles bursts (~few/sec)
 * and answers 429 with a `Retry-After`; a signage poll is serial so one retry
 * clears it. Cap the wait so it stays inside the scheduler's fetch timeout.
 */
async function fetchPrices(
  bzn: string,
  startDate: string,
  endDate: string,
  ctx: ConnectorContext,
): Promise<PriceResponse> {
  const url =
    `${PRICE_API}?bzn=${encodeURIComponent(bzn)}` +
    `&start=${startDate}&end=${endDate}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, ctx.signal ? { signal: ctx.signal } : {});
    if (response.status === 429 && attempt === 0) {
      const retryAfter = Number(response.headers.get('retry-after')) || 3;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(retryAfter, 8) * 1000),
      );
      continue;
    }
    if (!response.ok) {
      throw new Error(`power-prices upstream ${response.status}`);
    }
    return (await response.json()) as PriceResponse;
  }
  throw new Error('power-prices upstream 429');
}

/**
 * Electricity spot-price connector (`server`), backed by energy-charts.info
 * day-ahead prices (EUR/MWh, keyless). Area-only cache key. The upstream may
 * publish 15-minute resolution, so raw points are averaged into hourly buckets
 * keyed by the AREA's local hour; only today's hours are kept, and "now" is
 * resolved in the area's timezone. Prices are converted to EUR per kWh.
 */
export const powerPricesConnector: AppConnector<
  PowerPricesConfig,
  PowerPricesPayload
> = {
  cacheKey(config) {
    return `power:${powerAreaByValue(config.area).value}`;
  },

  async fetchData(
    config: PowerPricesConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<PowerPricesPayload>> {
    const area = powerAreaByValue(config.area);
    const now = Date.now();
    const body = await fetchPrices(
      area.value,
      utcYmd(now - DAY_MS),
      utcYmd(now + 2 * DAY_MS),
      ctx,
    );

    const seconds = Array.isArray(body.unix_seconds) ? body.unix_seconds : [];
    const prices = Array.isArray(body.price) ? body.price : [];

    // Average raw points (hourly or 15-minute) into hourly buckets by local hour.
    const buckets = new Map<
      string,
      { date: string; hour: number; sum: number; count: number }
    >();
    for (let i = 0; i < seconds.length; i += 1) {
      const price = prices[i];
      if (typeof price !== 'number') continue;
      const { date, hour } = localParts(seconds[i] * 1000, area.tz);
      const key = `${date}T${hour}`;
      const bucket = buckets.get(key) ?? { date, hour, sum: 0, count: 0 };
      bucket.sum += price;
      bucket.count += 1;
      buckets.set(key, bucket);
    }

    const today = localParts(now, area.tz);
    const hours: PowerHour[] = [];
    for (const bucket of buckets.values()) {
      if (bucket.date !== today.date) continue;
      // EUR/MWh → EUR/kWh.
      hours.push({
        start: hourIso(bucket.date, bucket.hour),
        eur: bucket.sum / bucket.count / 1000,
      });
    }
    hours.sort((a, b) => a.start.localeCompare(b.start));
    if (hours.length === 0) {
      throw new Error('power-prices: no records for today');
    }

    const currentHourIso = hourIso(today.date, today.hour);
    let currentIndex = hours.findIndex((hour) => hour.start === currentHourIso);
    if (currentIndex === -1) {
      for (let i = hours.length - 1; i >= 0; i -= 1) {
        if (hours[i].start <= currentHourIso) {
          currentIndex = i;
          break;
        }
      }
    }

    const observedAt = hours[hours.length - 1]?.start ?? '';
    ctx.logger.debug('power-prices fetched', {
      area: area.value,
      hours: hours.length,
    });
    return {
      playerPayload: {
        area: area.value,
        areaLabel: area.label,
        currentIndex,
        hours,
        observedAt,
      },
    };
  },
};
