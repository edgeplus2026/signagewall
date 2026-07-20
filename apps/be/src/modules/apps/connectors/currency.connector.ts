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

/**
 * Daily exchange rates via the open currency-api dataset — no API key, no rate
 * limit, and (unlike ECB/Frankfurter) it quotes non-ECB currencies such as RSD.
 * One request returns every rate against the base; we pick the targets out.
 * The pages.dev mirror is the publisher's own fallback host for the same data.
 */
const FX_HOSTS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies',
  'https://latest.currency-api.pages.dev/v1/currencies',
];

/** Uppercase ISO codes, de-duplicated, with the base removed and sorted. */
function normalizeTargets(
  targets: string[] | undefined,
  base: string,
): string[] {
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

/** The upstream body: a date plus a lowercase-keyed rate table under the base. */
interface FxUpstream {
  date?: string;
  [base: string]: unknown;
}

/**
 * Fetch the base's rate table, trying each host in order. A host is only a
 * fallback for the next one on network/HTTP errors — an abort stops the chain.
 */
async function fetchUpstream(
  base: string,
  ctx: ConnectorContext,
): Promise<FxUpstream> {
  let lastError: unknown;
  for (const host of FX_HOSTS) {
    if (ctx.signal?.aborted) throw lastError ?? new Error('currency: aborted');
    try {
      const url = `${host}/${base.toLowerCase()}.json`;
      const response = await fetch(
        url,
        ctx.signal ? { signal: ctx.signal } : {},
      );
      if (!response.ok) {
        throw new Error(`currency upstream ${response.status}`);
      }
      return (await response.json()) as FxUpstream;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('currency: all upstreams failed');
}

/**
 * Exchange-rates connector (`server`). The cache key is the base plus the SORTED
 * target set, so instances that watch the same currencies — in any display order,
 * with any typography — share a single upstream fetch. The payload carries the
 * rates in that same sorted order and the upstream reference date (published once
 * per day); no fetch timestamp, so an unchanged day of rates never fans out to
 * every screen.
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

    const body = await fetchUpstream(base, ctx);
    const table = body[base.toLowerCase()];
    const upstream: Record<string, unknown> =
      table && typeof table === 'object'
        ? (table as Record<string, unknown>)
        : {};

    // Keep the sorted target order and drop any code the upstream didn't quote,
    // so one bad code degrades to "not shown" rather than a wrong/zero rate.
    const rates: FxRate[] = targets
      .filter((code) => typeof upstream[code.toLowerCase()] === 'number')
      .map((code) => ({ code, rate: upstream[code.toLowerCase()] as number }));

    if (rates.length === 0) {
      throw new Error('currency: no rates returned');
    }

    ctx.logger.debug('currency fetched', { base, count: rates.length });
    return {
      playerPayload: {
        base,
        date: typeof body.date === 'string' ? body.date : '',
        rates,
      },
    };
  },
};
