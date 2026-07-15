import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { FxPayload, FxRate } from '@edge/apps';

interface CurrencyConfig {
  base?: string;
  targets?: string[];
}

/** ECB reference rates via Frankfurter — no API key, no rate limit worth minding. */
const FX_API = 'https://api.frankfurter.dev/v1/latest';

/** Uppercase ISO codes, de-duplicated, with the base removed and sorted. */
function normalizeTargets(targets: string[] | undefined, base: string): string[] {
  const seen = new Set<string>();
  for (const raw of targets ?? []) {
    const code = String(raw).trim().toUpperCase();
    if (code && code !== base) seen.add(code);
  }
  return [...seen].sort();
}

function baseOf(config: CurrencyConfig): string {
  return (config.base ?? 'EUR').trim().toUpperCase() || 'EUR';
}

/**
 * Exchange-rates connector (`server`). The cache key is the base plus the SORTED
 * target set, so instances that watch the same currencies — in any display order,
 * with any typography — share a single upstream fetch. The payload carries the
 * rates in that same sorted order and the ECB reference date; no fetch timestamp,
 * so an unchanged day of rates never fans out to every screen.
 */
export const currencyConnector: AppConnector<CurrencyConfig, FxPayload> = {
  cacheKey(config) {
    const base = baseOf(config);
    return `fx:${base}:${normalizeTargets(config.targets, base).join(',')}`;
  },

  async fetchData(
    config: CurrencyConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<FxPayload>> {
    const base = baseOf(config);
    const targets = normalizeTargets(config.targets, base);
    if (targets.length === 0) {
      throw new Error('currency: no target currencies');
    }

    const url = `${FX_API}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(targets.join(','))}`;
    const response = await fetch(url, ctx.signal ? { signal: ctx.signal } : {});
    if (!response.ok) {
      throw new Error(`currency upstream ${response.status}`);
    }
    const body = (await response.json()) as {
      base?: string;
      date?: string;
      rates?: Record<string, number>;
    };

    const upstream = body.rates ?? {};
    // Keep the sorted target order and drop any code the upstream didn't quote,
    // so one bad code degrades to "not shown" rather than a wrong/zero rate.
    const rates: FxRate[] = targets
      .filter((code) => typeof upstream[code] === 'number')
      .map((code) => ({ code, rate: upstream[code] as number }));

    if (rates.length === 0) {
      throw new Error('currency: no rates returned');
    }

    ctx.logger.debug('currency fetched', { base, count: rates.length });
    return {
      playerPayload: {
        base: body.base ?? base,
        date: body.date ?? '',
        rates,
      },
    };
  },
};
