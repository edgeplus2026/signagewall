/**
 * Normalized quote payload — the contract between the backend `wisdom` connector
 * and the embed bundle. The connector selects a batch from the vendored corpus
 * once per refresh per CATEGORY SET, and fans it out; the bundle applies the
 * instance's `quoteCount`, picks a design per quote, and rotates.
 *
 * The cache key is the chosen categories, and ONLY the categories. Everything else
 * an operator can set (`quoteCount`) is display-only and is
 * applied by the bundle, so it must never reach this object — otherwise two
 * screens on the same topics but a different rotation speed would each pay for
 * their own selection.
 *
 * The corpus is a third-party compilation and the text is NOT trusted markup: the
 * bundle escapes it before rendering.
 *
 * Deliberately free of timestamps and any other value that moves on its own. The
 * host decides whether to fan a refresh out to every player by deep-comparing
 * this object against the last one, so a `fetchedAt` in here would make an
 * unchanged batch look new on every single refresh. Data *age* is carried
 * out-of-band, in the `meta` the host sends alongside (see `AppDataMeta`).
 *
 * EVERYTHING ADDED AFTER v1 MUST BE OPTIONAL. A player's snapshot caches the
 * last payload it was given, so a screen that has been offline since before a
 * connector change is still rendering a payload of the older shape.
 */
export interface WisdomPayload {
  quotes: WisdomQuote[]
}

export interface WisdomQuote {
  /** Plain text: trimmed, length-capped and de-duplicated by the connector. */
  text: string
  /** Absent when upstream attributes the quote to nobody. */
  author?: string
}
