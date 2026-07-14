/**
 * Normalized RSS payload — the contract between the backend `rss` connector and
 * the embed bundle. The connector returns the feed's full normalized item list
 * (capped); the bundle applies the instance's `itemCount`, layout and rotation.
 * A coarse `cacheKey` (the feed URL) is shared across every instance of the same
 * feed, so display settings must never influence what the connector stores here.
 *
 * Everything in here comes from a third party. `link` and `imageUrl` are
 * guaranteed to be http(s) — the connector drops any other scheme — but the text
 * fields are NOT trusted markup: the bundle escapes them before rendering.
 *
 * Deliberately free of timestamps and any other value that moves on its own. The
 * host decides whether to fan a refresh out to every player by deep-comparing
 * this object against the last one, so a `fetchedAt` in here would make an
 * unchanged feed look new on every single refresh. Data *age* is carried
 * out-of-band, in the `meta` the host sends alongside (see `AppDataMeta`).
 */
export interface RssPayload {
  /** Feed title, when the source provides one. */
  title: string
  /** The publication's own site. */
  link?: string
  items: RssItem[]
}

export interface RssItem {
  title: string
  /** The article itself — what the QR code encodes. Always http(s). */
  link?: string
  /** Plain text: HTML-stripped and truncated by the connector. */
  summary?: string
  /** The story's image. Always http(s); absent when the feed carries none. */
  imageUrl?: string
  /** ISO publish date when available. */
  publishedAt?: string
}
