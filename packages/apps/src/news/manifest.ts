import type { AppManifest } from '@edge/apps-contract'

import { DEFAULT_DISPLAY_MODE, displayModeOptions } from '../rss/display-modes.js'
import { ITEM_COUNT, SECONDS_PER_STORY } from '../rss/limits.js'
import { DEFAULT_NEWS_SOURCE, newsSourceOptions } from './sources.js'

const NEWS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 20H5a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13a2 2 0 0 0 2 2 2 2 0 0 0 2-2V8h-3"/><path d="M7 8h6M7 12h6M7 16h4"/></svg>'

/**
 * News headlines — a `server` app that is a curated front-end to the `rss` app.
 * Instead of asking the operator for a feed URL, it offers a `select` of known
 * publishers (BBC, Sky, NPR, Al Jazeera, CNBC, TechCrunch, ESPN, …). The chosen
 * option's VALUE is that publisher's feed URL, stored under the `url` key — so
 * this app rides the existing `rss` connector unchanged (registered under the
 * `news` slug in the connector registry) and reuses the `rss` embed wholesale.
 *
 * Because the cache key is the feed URL (`rss:<hash(url)>`), a `news` instance and
 * a free-text `rss` instance pointed at the same feed share one upstream fetch.
 * Everything else here — layout, theme, QR, counts — is display-only, exactly as
 * in `rss`. Add or retire a source in `sources.ts`; nothing else changes.
 */
export const newsManifest: AppManifest = {
  slug: 'news',
  name: 'News headlines',
  tagline: 'Latest headlines from a news source you pick',
  description:
    'Pick a news publisher and the screen shows its latest headlines — no feed URLs to hunt down. Refreshes on its own.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 300,
  icon: NEWS_ICON,
  color: '#DC2626',
  configSchema: [
    {
      key: 'url',
      type: 'select',
      label: 'News source',
      required: true,
      default: DEFAULT_NEWS_SOURCE,
      options: newsSourceOptions(),
      help: 'Pick a publisher. For any other feed, use the RSS feed app instead.',
    },
    {
      key: 'displayMode',
      type: 'select',
      label: 'Layout',
      help: 'How the stories are arranged on the screen.',
      default: DEFAULT_DISPLAY_MODE,
      options: displayModeOptions(),
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      default: 'dark',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    {
      key: 'showQr',
      type: 'switch',
      label: 'Show QR code',
      help: 'Puts a code beside the story so people can scan it and keep reading on their phone.',
      default: true,
    },
    {
      key: 'itemCount',
      type: 'number',
      label: 'How many stories',
      section: 'Feed Settings',
      help: 'How many of the newest stories to use. Older ones are ignored.',
      default: ITEM_COUNT.default,
      validation: { min: ITEM_COUNT.min, max: ITEM_COUNT.max },
    },
    {
      key: 'secondsPerStory',
      type: 'number',
      label: 'Seconds per story',
      section: 'Feed Settings',
      help: 'How long each story stays up, in layouts that move from one story to the next.',
      default: SECONDS_PER_STORY.default,
      validation: { min: SECONDS_PER_STORY.min, max: SECONDS_PER_STORY.max },
    },
  ],
}
