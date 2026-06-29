/**
 * Normalized RSS payload — shared contract between the backend `rss` connector
 * and the embed bundle. The connector returns the full normalized item list for
 * the feed (raw); the bundle applies the instance's `maxItems` and cycling. A
 * coarse `cacheKey` (feed URL hash) is shared across instances of the same feed.
 */
export interface RssPayload {
  /** Feed title, when the source provides one. */
  title: string
  items: RssItem[]
  /** ISO timestamp of the fetch. */
  fetchedAt: string
}

export interface RssItem {
  title: string
  /** ISO publish date when available. */
  publishedAt?: string
}
