import type { FieldOption } from '@edge/apps-contract'

/** A coin we offer in the picker: CoinGecko id + ticker + display name. */
export interface Coin {
  id: string
  symbol: string
  name: string
}

/**
 * The coins offered in the config picker. `id` is the CoinGecko id the API
 * expects; `symbol`/`name` are for display (CoinGecko's price endpoint returns
 * neither, so the connector labels from this list). Keep the ids valid — an
 * unknown id simply comes back with no price and is dropped.
 */
export const COIN_LIST: Coin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'tether', symbol: 'USDT', name: 'Tether' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  { id: 'tron', symbol: 'TRX', name: 'TRON' },
]

/** Lookup from CoinGecko id to its display symbol/name. */
export const COINS_BY_ID = new Map<string, Coin>(
  COIN_LIST.map((coin) => [coin.id, coin]),
)

/** The `coins` multiselect options, in the list's order. */
export function coinOptions(): FieldOption[] {
  return COIN_LIST.map((coin) => ({
    label: `${coin.name} (${coin.symbol})`,
    value: coin.id,
  }))
}
