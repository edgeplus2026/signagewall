import type { AppManifest } from '@edge/apps-contract'

import { DEFAULT_ACCENT } from '../_shared/theme.js'
import { styleFields } from '../_shared/style-fields.js'

const TICKER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h2"/><path d="M11 12h7"/></svg>'

/**
 * Announcement ticker — a scrolling band of messages. Pure client-side
 * (`static`). Messages are one-per-line for now (a `textarea`); a proper
 * repeater field (add/remove/reorder rows) is the follow-up in BACKLOG.md (E4).
 *
 * Deliberately few knobs: the messages, how fast they move, which way, and where
 * the band sits. The look follows the theme + the shared Style Settings, so the
 * band matches the rest of a playlist without a pile of colour pickers.
 */
export const tickerManifest: AppManifest = {
  slug: 'ticker',
  name: 'Ticker',
  tagline: 'Scroll announcements across the screen',
  description:
    'A moving band of short messages — news, notices, opening hours. Type one message per line.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: TICKER_ICON,
  color: '#F43F5E',
  configSchema: [
    {
      key: 'messages',
      type: 'repeater',
      label: 'Messages',
      help: 'The messages to scroll, one per row. They repeat in order.',
      required: true,
      validation: { min: 1 },
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
      default: 'middle',
      options: [
        { label: 'Top', value: 'top' },
        { label: 'Middle', value: 'middle' },
        { label: 'Bottom', value: 'bottom' },
      ],
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      help: 'A starting point — it fills in the colours below, which you can still change.',
      default: 'dark',
      options: [
        {
          label: 'Light',
          value: 'light',
          set: {
            backgroundColor: '#FFFFFF',
            textColor: '#0F172A',
            accentColor: DEFAULT_ACCENT,
          },
        },
        {
          label: 'Dark',
          value: 'dark',
          set: {
            backgroundColor: '#000000',
            textColor: '#FFFFFF',
            accentColor: DEFAULT_ACCENT,
          },
        },
      ],
    },
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Background colour',
      section: 'Theme Settings',
      default: '#000000',
    },
    {
      key: 'textColor',
      type: 'color',
      label: 'Text colour',
      section: 'Theme Settings',
      default: '#FFFFFF',
    },
    {
      key: 'accentColor',
      type: 'color',
      label: 'Accent colour',
      section: 'Theme Settings',
      help: 'The separators between messages.',
      default: DEFAULT_ACCENT,
    },
    ...styleFields(),
  ],
}
