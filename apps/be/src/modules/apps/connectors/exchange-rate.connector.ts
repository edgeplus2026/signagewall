import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { FxPayload } from '@edge/apps';

interface FxConfig {
  base?: string;
  // `quotes` is display-only (the bundle selects which rates to show); the
  // connector returns ALL rates against the base, so it is not in the cache key.
  quotes?: string;
}

const FX_URL = 'https://api.frankfurter.app/latest';

function normalizeBase(base: string): string {
  return base.trim().toUpperCase();
}

/**
 * Exchange-rate connector backed by frankfurter.app (ECB data, no API key). The
 * cache key is the base currency, so all instances on the same base share one
 * fetch regardless of which quote currencies they display. Returns every rate
 * against the base; the embed bundle picks the configured quotes.
 */
export const exchangeRateConnector: AppConnector<FxConfig, FxPayload> = {
  cacheKey(config) {
    return `fx:${normalizeBase(config.base ?? 'EUR').toLowerCase()}`;
  },

  async fetchData(
    config: FxConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<FxPayload>> {
    const base = normalizeBase(config.base ?? 'EUR');
    if (!base) {
      throw new Error('fx: missing base currency');
    }

    const response = await fetch(
      `${FX_URL}?from=${encodeURIComponent(base)}`,
      ctx.signal ? { signal: ctx.signal } : {},
    );
    if (!response.ok) {
      throw new Error(`fx upstream ${response.status}`);
    }
    const json = (await response.json()) as {
      base?: string;
      date?: string;
      rates?: Record<string, number>;
    };

    if (!json.rates || Object.keys(json.rates).length === 0) {
      throw new Error('fx: no rates returned');
    }

    ctx.logger.debug('fx fetched', { base });
    return {
      playerPayload: {
        base: json.base ?? base,
        rates: json.rates,
        date: json.date ?? new Date().toISOString().slice(0, 10),
      },
    };
  },
};
