import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import { ConnectorError } from '@signagewall/apps-contract';
import { COIN_LIST } from '@signagewall/apps';
import type { CryptoCoin, CryptoPayload } from '@signagewall/apps';

interface CryptoConfig {
  coins?: string[];
  vs?: string;
}

/** CoinGecko's free price endpoint — no API key (rate-limited, hence a coarse key). */
const PRICE_API = 'https://api.coingecko.com/api/v3/simple/price';

/** Lowercase, de-duplicated, sorted coin ids (the cache-key set). */
function normalizeIds(coins: string[] | undefined): string[] {
  const seen = new Set<string>();
  for (const raw of coins ?? []) {
    const id = String(raw).trim().toLowerCase();
    if (id) seen.add(id);
  }
  return [...seen].sort();
}

function vsOf(config: CryptoConfig): string {
  return (config.vs ?? 'usd').trim().toLowerCase() || 'usd';
}

/**
 * Crypto connector (`server`). The cache key is the SORTED coin set plus the
 * quote currency, so instances watching the same coins — in any display order,
 * with any typography — share one fetch. The payload lists coins in the curated
 * {@link COIN_LIST} order (display order can't be per-instance when the fetch is
 * shared) and carries no fetch timestamp — prices fan out only when they move.
 */
export const cryptoConnector: AppConnector<CryptoConfig, CryptoPayload> = {
  cacheKey(config) {
    return `crypto:${normalizeIds(config.coins).join(',')}:${vsOf(config)}`;
  },

  async fetchData(
    config: CryptoConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<CryptoPayload>> {
    const ids = normalizeIds(config.coins);
    const vs = vsOf(config);
    if (ids.length === 0) {
      throw new ConnectorError('config_invalid', 'crypto: no coins selected');
    }

    const url =
      `${PRICE_API}?ids=${encodeURIComponent(ids.join(','))}` +
      `&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true`;
    const response = await fetch(url, ctx.signal ? { signal: ctx.signal } : {});
    if (!response.ok) {
      throw new Error(`crypto upstream ${response.status}`);
    }
    const body = (await response.json()) as Record<
      string,
      Record<string, number>
    >;

    const requested = new Set(ids);
    // Curated order (BTC, ETH, …), limited to the coins actually requested and
    // returned; an unknown/omitted id degrades to "not shown".
    const coins: CryptoCoin[] = [];
    for (const coin of COIN_LIST) {
      if (!requested.has(coin.id)) continue;
      const quote = body[coin.id];
      const price = quote?.[vs];
      if (typeof price !== 'number') continue;
      const change = quote[`${vs}_24h_change`];
      coins.push({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        price,
        ...(typeof change === 'number' ? { change24h: change } : {}),
      });
    }

    if (coins.length === 0) {
      throw new Error('crypto: no prices returned');
    }

    ctx.logger.debug('crypto fetched', { vs, count: coins.length });
    return { playerPayload: { vs, coins } };
  },
};
