import type { AppManifest } from '@signagewall/apps-contract'

import { styleFields } from '../_shared/style-fields.js'

const TICKER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h2"/><path d="M11 12h7"/></svg>'

/**
 * Announcement ticker — a scrolling band of messages drawn as a persistent
 * OVERLAY (sticky at the top or bottom) on top of whatever the screen is
 * playing. It is not a rotation item: the operator picks the screens it shows
 * on via the `screens` field, and the player keeps the band up across every
 * slide on those screens.
 *
 * Messages come from repeater rows, or live from an RSS feed (headlines) — the
 * backend connector resolves either into one `{ messages }` payload, so the
 * band is identical to render whichever source feeds it.
 */
export const tickerManifest: AppManifest = {
  slug: 'ticker',
  name: 'Ticker',
  tagline: 'Scroll announcements across the screen',
  description:
    'A moving band of short messages or live RSS headlines, always visible over your content. Pick the screens it shows on.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 2,
  overlay: true,
  // RSS mode refresh cadence; the messages mode payload is effectively free.
  refreshSeconds: 300,
  icon: TICKER_ICON,
  color: '#F43F5E',
  configSchema: [
    {
      key: 'screens',
      type: 'screens',
      label: 'Show on screens',
      help: 'The ticker stays visible over everything these screens play.',
    },
    {
      key: 'source',
      type: 'select',
      label: 'Source',
      default: 'messages',
      options: [
        { label: 'My messages', value: 'messages' },
        { label: 'RSS feed', value: 'rss' },
      ],
      help: 'Scroll your own messages, or live headlines from an RSS feed.',
    },
    {
      key: 'messages',
      type: 'repeater',
      label: 'Messages',
      help: 'The messages to scroll. They repeat in order, drag to reorder.',
      required: true,
      validation: { min: 1 },
      visibleWhen: { field: 'source', equals: 'messages' },
      fields: [
        {
          key: 'message',
          type: 'text',
          label: 'Message',
          required: true,
          placeholder: 'Welcome!',
        },
      ],
    },
    {
      key: 'rssUrl',
      type: 'url',
      label: 'RSS feed URL',
      required: true,
      placeholder: 'https://example.com/feed.xml',
      visibleWhen: { field: 'source', equals: 'rss' },
      help: 'Headlines from this feed scroll in the band and refresh automatically.',
    },
    {
      key: 'speed',
      type: 'select',
      label: 'Speed',
      default: 'normal',
      options: [
        { label: 'Slow', value: 'slow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Fast', value: 'fast' },
      ],
    },
    {
      key: 'direction',
      type: 'select',
      label: 'Direction',
      default: 'left',
      options: [
        { label: 'Right to left', value: 'left' },
        { label: 'Left to right', value: 'right' },
      ],
    },
    {
      key: 'position',
      type: 'select',
      label: 'Position',
      help: 'Where the band sits on the screen.',
      default: 'bottom',
      options: [
        { label: 'Top', value: 'top' },
        { label: 'Bottom', value: 'bottom' },
      ],
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      help: 'A starting point. It fills in the colors below, which you can still change.',
      default: 'dark',
      options: [
        {
          label: 'Light',
          value: 'light',
          set: {
            backgroundColor: '#FFFFFF',
            textColor: '#0F172A',
          },
        },
        {
          label: 'Dark',
          value: 'dark',
          set: {
            backgroundColor: '#000000',
            textColor: '#FFFFFF',
          },
        },
      ],
    },
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Background color',
      section: 'Theme Settings',
      default: '#000000',
    },
    {
      key: 'textColor',
      type: 'color',
      label: 'Text color',
      section: 'Theme Settings',
      default: '#FFFFFF',
    },
    // No accent color: the separators between messages simply follow the text
    // color, so the band never needs a third swatch to keep in tune.
    ...styleFields(),
  ],
}
