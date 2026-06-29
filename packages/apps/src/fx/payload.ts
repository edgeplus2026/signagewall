/**
 * Normalized exchange-rate payload — shared contract between the backend `fx`
 * connector and the embed bundle. The connector returns every rate against the
 * base currency (raw); the bundle selects/formats the quote currencies from the
 * instance config. A coarse `cacheKey` (base currency) is shared across
 * instances regardless of which quotes they display.
 */
export interface FxPayload {
  /** Base currency ISO code, e.g. "EUR". */
  base: string
  /** Map of quote ISO code → rate against the base. */
  rates: Record<string, number>
  /** ISO date the rates are for. */
  date: string
}
