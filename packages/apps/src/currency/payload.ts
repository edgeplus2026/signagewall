/**
 * Normalized FX payload — the shared contract between the backend `currency`
 * connector (which fetches ECB reference rates via Frankfurter) and the embed
 * bundle (which renders them). One unit of `base` buys `rate` units of `code`.
 *
 * `date` is the upstream reference date (ECB publishes once per working day), so
 * it changes with the DATA, not with the fetch — an unchanged day of rates does
 * not fan out to every screen on each refresh.
 */
export interface FxPayload {
  /** ISO currency code of the base (one unit of this). */
  base: string
  /** Upstream reference date, `YYYY-MM-DD`. */
  date: string
  rates: FxRate[]
}

export interface FxRate {
  /** ISO currency code, e.g. "USD". */
  code: string
  /** How many `code` one `base` buys. */
  rate: number
}
