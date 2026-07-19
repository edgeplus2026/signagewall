import type { FieldOption } from '@edge/apps-contract'

/**
 * The curated news feeds the `news` app offers. Each is a real RSS/Atom feed URL;
 * the `news` manifest exposes them as a `select` whose VALUE is the feed URL and
 * whose config key is `url` — so the app rides the existing `rss` connector
 * unchanged (it reads `config.url`, hashes it for the cache key, fetches and
 * normalizes it). Picking a source here is just choosing a feed for that same
 * connector; the free-text `rss` app remains for any other feed.
 *
 * Feeds were checked live before they were added. A couple of majors (The
 * Guardian, The Verge) block automated crawlers at their CDN but serve standard,
 * stable feeds to ordinary clients; they are marked below. If a source ever goes
 * dark the app fails cleanly (the screen holds its last stories) and the operator
 * can pick another — but keep this list curated to feeds known to work.
 */
export interface NewsSource {
  label: string
  url: string
  category: 'World' | 'Business' | 'Technology' | 'Sport'
}

export const NEWS_SOURCES: NewsSource[] = [
  // World / general
  { label: 'BBC News — Top Stories', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
  { label: 'BBC News — World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World' },
  { label: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/home.xml', category: 'World' },
  { label: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'World' },
  { label: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World' },
  { label: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/latest.xml', category: 'World' },
  // The Guardian serves a standard feed but blocks automated crawlers at its CDN.
  { label: 'The Guardian — World', url: 'https://www.theguardian.com/world/rss', category: 'World' },
  // Business
  { label: 'CNBC — Top News', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', category: 'Business' },
  { label: 'BBC News — Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business' },
  // Technology
  { label: 'BBC News — Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology' },
  { label: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Technology' },
  // The Verge serves a standard Atom feed but blocks automated crawlers at its CDN.
  { label: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Technology' },
  { label: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'Technology' },
  // Sport
  { label: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sport' },
  { label: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'Sport' },
]

/** The default source shown on a new instance (BBC top stories). */
export const DEFAULT_NEWS_SOURCE = NEWS_SOURCES[0]!.url

/** The source list as the `url` `select` field's options (value = feed URL). */
export function newsSourceOptions(): FieldOption[] {
  return NEWS_SOURCES.map((source) => ({
    label: source.label,
    value: source.url,
  }))
}
