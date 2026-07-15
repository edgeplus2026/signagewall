import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { StockQuote, StocksPayload } from '@edge/apps';

import { requireConnectorKey } from './env.util';

interface StocksConfig {
  // Repeater rows (`{symbol}[]`) from the current form, or a legacy newline
  // string from an older config; `normalizeSymbols` accepts both.
  symbols?: unknown;
  // `showChange` is display-only (the bundle applies it); not in the cacheKey.
  showChange?: boolean;
}

/** Finnhub quote endpoint (free tier; needs a token). */
const QUOTE_API = 'https://finnhub.io/api/v1/quote';

/** Cap the ticker set — one upstream call per ticker, and a wall shows a handful. */
const MAX_SYMBOLS = 15;

/** Uppercased, de-duplicated, sorted tickers — from repeater rows or a legacy string. */
function normalizeSymbols(raw: unknown): string[] {
  const seen = new Set<string>();
  const add = (value: unknown): void => {
    if (typeof value === 'string') {
      const symbol = value.trim().toUpperCase();
      if (symbol) seen.add(symbol);
    }
  };
  if (Array.isArray(raw)) {
    for (const row of raw) {
      add((row as Record<string, unknown> | null)?.symbol);
    }
  } else if (typeof raw === 'string') {
    for (const line of raw.split('\n')) add(line);
  }
  return [...seen].sort().slice(0, MAX_SYMBOLS);
}

/** Finnhub `/quote`: current, change, %change, previous close. */
interface FinnhubQuote {
  c?: number;
  d?: number | null;
  dp?: number | null;
  pc?: number;
}

/**
 * Fetch one ticker's quote. Returns null for an unknown ticker (Finnhub answers
 * 200 with all-zero fields) so it degrades to "not shown". A 401 means the key
 * itself is bad — that must surface, not be swallowed as a missing ticker.
 */
async function fetchQuote(
  symbol: string,
  token: string,
  signal: AbortSignal | undefined,
): Promise<StockQuote | null> {
  const url = `${QUOTE_API}?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;
  const response = await fetch(url, signal ? { signal } : {});
  if (response.status === 401) {
    throw new Error('stocks: FINNHUB_API_KEY rejected');
  }
  if (!response.ok) {
    return null;
  }
  const quote = (await response.json()) as FinnhubQuote;
  // An unknown ticker comes back as zeros; a real one always has a price.
  if (typeof quote.c !== 'number' || quote.c === 0) {
    return null;
  }
  return {
    symbol,
    price: quote.c,
    change: typeof quote.d === 'number' ? quote.d : 0,
    changePercent: typeof quote.dp === 'number' ? quote.dp : 0,
  };
}

/**
 * Stocks connector (`server`, keyed — see enabler E5). Coarse cache key over the
 * SORTED ticker set, so screens on the same tickers (any order, any typography)
 * share one fetch. Reads `FINNHUB_API_KEY` from the backend env; a missing key
 * throws cleanly and the host keeps the last quotes on screen. No fetch
 * timestamp — prices fan out only when they move.
 */
export const stocksConnector: AppConnector<StocksConfig, StocksPayload> = {
  cacheKey(config) {
    return `stocks:${normalizeSymbols(config.symbols).join(',')}`;
  },

  async fetchData(
    config: StocksConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<StocksPayload>> {
    const token = requireConnectorKey('FINNHUB_API_KEY');
    const symbols = normalizeSymbols(config.symbols);
    if (symbols.length === 0) {
      throw new Error('stocks: no tickers');
    }

    const results = await Promise.all(
      symbols.map((symbol) => fetchQuote(symbol, token, ctx.signal)),
    );
    const quotes = results.filter((quote): quote is StockQuote => quote !== null);
    if (quotes.length === 0) {
      throw new Error('stocks: no quotes returned');
    }

    ctx.logger.debug('stocks fetched', { count: quotes.length });
    return { playerPayload: { quotes } };
  },
};
