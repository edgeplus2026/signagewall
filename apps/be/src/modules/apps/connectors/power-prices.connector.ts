import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { PowerHour, PowerPricesPayload } from '@edge/apps';

interface PowerPricesConfig {
  area?: string;
  // `currency` is display-only (both travel in the payload); not in the cacheKey.
  currency?: string;
}

/** Energinet's open energy-data service — Elspotprices dataset, no API key. */
const ELSPOT_API = 'https://api.energidataservice.dk/dataset/Elspotprices';

/** Spot prices are quoted per MWh; signage shows per kWh (divide — exact, no float noise). */
const KWH_PER_MWH = 1000;
const HOUR_MS = 60 * 60 * 1000;

function areaOf(config: PowerPricesConfig): string {
  return (config.area ?? 'DK1').trim().toUpperCase() || 'DK1';
}

/** Energinet's `HourUTC` has no zone suffix but IS UTC — parse it as such. */
function utcMillis(hourUtc: string): number {
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(hourUtc) ? hourUtc : `${hourUtc}Z`;
  return new Date(iso).getTime();
}

interface ElspotRecord {
  HourUTC: string;
  HourDK: string;
  SpotPriceDKK: number | null;
  SpotPriceEUR: number | null;
}

/**
 * Electricity spot-price connector (`server`). Area-only cache key — both
 * currencies ride in the payload, so a currency choice never splits the fetch.
 * Fetches the most recent 48 hourly prices for the area, orders them ascending,
 * and resolves which hour is "now" from UTC on the server. No fetch timestamp:
 * day-ahead prices only change when a new day publishes.
 */
export const powerPricesConnector: AppConnector<
  PowerPricesConfig,
  PowerPricesPayload
> = {
  cacheKey(config) {
    return `power:${areaOf(config)}`;
  },

  async fetchData(
    config: PowerPricesConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<PowerPricesPayload>> {
    const area = areaOf(config);
    const filter = JSON.stringify({ PriceArea: [area] });
    const url =
      `${ELSPOT_API}?filter=${encodeURIComponent(filter)}` +
      `&sort=${encodeURIComponent('HourUTC DESC')}&limit=48`;

    const response = await fetch(url, ctx.signal ? { signal: ctx.signal } : {});
    if (!response.ok) {
      throw new Error(`power-prices upstream ${response.status}`);
    }
    const body = (await response.json()) as { records?: ElspotRecord[] };

    // Upstream is newest-first; the curve reads oldest-to-newest.
    const records = [...(body.records ?? [])].reverse();
    if (records.length === 0) {
      throw new Error('power-prices: no records');
    }

    const hours: PowerHour[] = [];
    const utcMs: number[] = [];
    for (const record of records) {
      const hour: PowerHour = { start: record.HourDK };
      if (typeof record.SpotPriceDKK === 'number') {
        hour.dkk = record.SpotPriceDKK / KWH_PER_MWH;
      }
      if (typeof record.SpotPriceEUR === 'number') {
        hour.eur = record.SpotPriceEUR / KWH_PER_MWH;
      }
      hours.push(hour);
      utcMs.push(utcMillis(record.HourUTC));
    }

    // Which hour contains "now" — else the latest hour already started, else -1.
    const now = Date.now();
    let currentIndex = utcMs.findIndex((ms) => ms <= now && now < ms + HOUR_MS);
    if (currentIndex === -1) {
      for (let i = utcMs.length - 1; i >= 0; i -= 1) {
        if (utcMs[i] <= now) {
          currentIndex = i;
          break;
        }
      }
    }

    const observedAt = hours[hours.length - 1]?.start ?? '';
    ctx.logger.debug('power-prices fetched', { area, hours: hours.length });
    return {
      playerPayload: { area, currentIndex, hours, observedAt },
    };
  },
};
