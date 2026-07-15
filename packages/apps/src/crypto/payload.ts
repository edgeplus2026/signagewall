/**
 * Normalized crypto payload — the shared contract between the backend `crypto`
 * connector (which fetches spot prices from CoinGecko) and the embed bundle.
 * Prices are in the instance's chosen `vs` fiat currency. No fetch timestamp:
 * prices move on their own, so a re-push happens when a price actually changes,
 * never on a bare clock tick.
 */
export interface CryptoPayload {
  /** Lowercase fiat code the prices are quoted in, e.g. "usd". */
  vs: string
  coins: CryptoCoin[]
}

export interface CryptoCoin {
  /** CoinGecko id, e.g. "bitcoin". */
  id: string
  /** Ticker symbol, e.g. "BTC". */
  symbol: string
  /** Display name, e.g. "Bitcoin". */
  name: string
  /** Current price in `vs`. */
  price: number
  /** 24-hour change as a percentage (e.g. 2.34 for +2.34%). */
  change24h?: number
}
