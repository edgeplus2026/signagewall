import type { AppManifest } from '@edge/apps-contract'

const RSS_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 110 4.36 2.18 2.18 0 010-4.36zM4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44zm0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z"/></svg>'

/**
 * RSS / News ticker — a `server` app. The backend connector fetches and
 * normalizes a feed once per feed URL (`rss:<hash(url)>`), so every screen
 * showing the same feed shares one upstream fetch. Items are returned raw; the
 * embed bundle renders/cycles them.
 */
export const rssManifest: AppManifest = {
  slug: 'rss',
  name: 'News / RSS',
  tagline: 'Show a live news or RSS feed',
  description:
    'Display the latest headlines from any RSS feed — perfect as a news ticker.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 300,
  icon: RSS_ICON,
  color: '#F97316',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Feed URL',
      required: true,
      placeholder: 'https://example.com/feed.xml',
    },
    {
      key: 'maxItems',
      type: 'number',
      label: 'Max headlines',
      default: 8,
      validation: { min: 1, max: 30 },
    },
  ],
}
