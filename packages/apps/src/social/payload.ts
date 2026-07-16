/**
 * Normalized social-feed payload — the shared contract between the backend
 * `instagram` / `facebook` connectors and their embed bundles. Both platforms
 * reduce to "an account and a list of recent posts", so one shape and one
 * renderer serve both (Facebook fills in what it has; Instagram is image-first).
 * Fetched per-connection (a feed is tied to a specific account), so the cacheKey
 * includes the connection id.
 *
 * NOTE — this payload is intentionally allowed to FAN OUT. A post's `imageUrl`
 * is a CDN URL that Meta rotates/expires (a signed `scontent…` link), so the
 * object legitimately differs on most refreshes. This connector therefore
 * returns NO `version`: the host deep-compares and re-pushes the fresh URLs, and
 * screens keep working images rather than caching a link that will 403 within
 * hours. Keep `refreshSeconds` modest to bound the fan-out. This mirrors the
 * deliberate choice documented on `GslidesPayload` (rotating thumbnail URLs).
 */
export interface SocialPayload {
  /** Account display name / @handle shown in the header. */
  accountLabel: string
  posts: SocialPost[]
}

export interface SocialPost {
  /** Stable post id (used as a render key). */
  id: string
  /** Post text / caption; empty for image-only posts. */
  text?: string
  /** Primary image URL, when the post has one. */
  imageUrl?: string
  /** Permalink to the post on the platform. */
  permalink?: string
  /** ISO 8601 publish time. */
  timestamp?: string
  /** 'image' | 'video' | 'text' — drives the media treatment in the embed. */
  mediaType?: 'image' | 'video' | 'text'
}
