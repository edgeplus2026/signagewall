import type { AppManifest } from '@signagewall/apps-contract'

import { DEFAULT_DISPLAY_MODE, displayModeOptions } from './display-modes.js'
import { ITEM_COUNT, SECONDS_PER_STORY } from './limits.js'

const RSS_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 110 4.36 2.18 2.18 0 010-4.36zM4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44zm0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z"/></svg>'

/**
 * RSS feed — a `server` app. The backend connector fetches and normalizes a feed
 * once per feed URL (`rss:<hash(url)>`) and fans the result out, so a hundred
 * screens on the same feed cost one upstream fetch per refresh. Everything the
 * operator picks here — layout, theme, QR, counts — is display-only and stays
 * out of the cache key on purpose.
 *
 * `displayMode` is the app's spine: the layouts live in `display-modes.ts` and
 * each has a template behind it in the embed. More layouts are coming; adding
 * one must not touch this file beyond the list it already reads.
 *
 * Deliberately few knobs. `theme` picks a whole look rather than exposing loose
 * background / text / accent colours, and there are no typography fields: this
 * app lays out a news story, and a story that stays legible on a wall is the
 * app's job to get right, not a thing to hand the operator five dials for.
 */
export const rssManifest: AppManifest = {
  slug: 'rss',
  name: 'RSS feed',
  tagline: 'Show the latest stories from any feed',
  description:
    'Point it at a news site or blog and the screen shows its latest stories, refreshed on its own.',
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
      label: 'Feed address',
      required: true,
      placeholder: 'https://example.com/feed.xml',
      // Almost nobody knows where their feed lives, and the failure ("I pasted
      // the homepage and got nothing") is silent. Say where to look.
      help: 'The site\'s RSS or Atom feed, usually the homepage address with "/feed" or "/rss" on the end.',
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
      // Deliberately NOT gated with `visibleWhen`: that can only test one layout
      // value, so it would silently hide this field the day a second moving
      // layout ships. The help carries the condition instead.
      help: 'How long each story stays up, in layouts that move from one story to the next.',
      default: SECONDS_PER_STORY.default,
      validation: { min: SECONDS_PER_STORY.min, max: SECONDS_PER_STORY.max },
    },
  ],
}
