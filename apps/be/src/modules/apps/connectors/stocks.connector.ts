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

/** Alpaca market-data snapshots — one call returns every symbol. */
const SNAPSHOTS_API = 'https://data.alpaca.markets/v2/stocks/snapshots';

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

/** The slice of an Alpaca snapshot we read. */
interface AlpacaSnapshot {
  /** Most recent trade — its `p`rice. */
  latestTrade?: { p?: number };
  /** Today's bar — `c`lose as a price fallback. */
  dailyBar?: { c?: number };
  /** Previous session's bar — `c`lose, the baseline for the day's change. */
  prevDailyBar?: { c?: number };
}

/** Round to 2dp so derived change/percent stay clean and don't fan out on float noise. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Build a quote from a symbol's snapshot, or null when there's no usable price
 * (an unknown ticker) so it degrades to "not shown". The daily change is against
 * the previous session's close.
 */
function toQuote(
  symbol: string,
  snap: AlpacaSnapshot | undefined,
): StockQuote | null {
  if (!snap) return null;
  const price = snap.latestTrade?.p ?? snap.dailyBar?.c;
  if (typeof price !== 'number') return null;
  const prevClose = snap.prevDailyBar?.c;
  const usable = typeof prevClose === 'number' && prevClose !== 0;
  return {
    symbol,
    price,
    change: usable ? round2(price - (prevClose as number)) : 0,
    changePercent: usable
      ? round2(((price - (prevClose as number)) / (prevClose as number)) * 100)
      : 0,
  };
}

/**
 * Stocks connector (`server`, keyed — see enabler E5). Coarse cache key over the
 * SORTED ticker set, so screens on the same tickers (any order, any typography)
 * share one fetch. Backed by Alpaca market data (`/v2/stocks/snapshots`): one
 * call returns every ticker with its latest trade and previous close, and its
 * terms allow commercial use (the free tier serves IEX data). Reads
 * `ALPACA_API_KEY_ID` + `ALPACA_API_SECRET_KEY` from the backend env; missing
 * credentials throw cleanly and the host keeps the last quotes on screen. No
 * fetch timestamp — prices fan out only when they move.
 */
export const stocksConnector: AppConnector<StocksConfig, StocksPayload> = {
  cacheKey(config) {
    return `stocks:${normalizeSymbols(config.symbols).join(',')}`;
  },

  async fetchData(
    config: StocksConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<StocksPayload>> {
    const keyId = requireConnectorKey('ALPACA_API_KEY_ID');
    const secret = requireConnectorKey('ALPACA_API_SECRET_KEY');
    const symbols = normalizeSymbols(config.symbols);
    if (symbols.length === 0) {
      throw new Error('stocks: no tickers');
    }

    const url = `${SNAPSHOTS_API}?symbols=${encodeURIComponent(symbols.join(','))}&feed=iex`;
    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secret,
      },
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error('stocks: Alpaca credentials rejected');
    }
    if (!response.ok) {
      throw new Error(`stocks upstream ${response.status}`);
    }

    // The multi-symbol endpoint returns a map keyed by symbol; some responses
    // wrap it under `snapshots`. Accept either.
    const raw = (await response.json()) as Record<string, unknown>;
    const map = (
      raw.snapshots && typeof raw.snapshots === 'object' ? raw.snapshots : raw
    ) as Record<string, AlpacaSnapshot>;

    // Keep the sorted order; drop tickers Alpaca returned nothing usable for.
    const quotes = symbols
      .map((symbol) => toQuote(symbol, map[symbol]))
      .filter((quote): quote is StockQuote => quote !== null);
    if (quotes.length === 0) {
      throw new Error('stocks: no quotes returned');
    }

    ctx.logger.debug('stocks fetched', { count: quotes.length });
    return { playerPayload: { quotes } };
  },
};
