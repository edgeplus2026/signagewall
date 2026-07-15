/**
 * Normalized stocks payload — the contract between the backend `stocks` connector
 * (Finnhub) and the embed bundle. One entry per ticker, in a stable sorted order
 * (display order can't be per-instance when the fetch is shared). No fetch
 * timestamp: prices move on their own, so a re-push happens when a price changes,
 * never on a bare clock tick.
 */
export interface StocksPayload {
  quotes: StockQuote[]
}

export interface StockQuote {
  /** Ticker symbol, e.g. "AAPL". */
  symbol: string
  /** Latest price. */
  price: number
  /** Absolute change since the previous close. */
  change: number
  /** Percentage change since the previous close. */
  changePercent: number
}
