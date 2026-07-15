import type { AppManifest } from '@edge/apps-contract'

import { DEFAULT_ACCENT } from '../_shared/theme.js'
import { styleFields } from '../_shared/style-fields.js'

const MENU_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>'

/**
 * Menu board / price list — a styled list of items and prices for cafés, canteens
 * and retail. Pure client-side (`static`). Items are one-per-line for now, in a
 * `Name | Price | Description` format (a `textarea`); a proper repeater field
 * (a row editor with separate name/price/description inputs) is the follow-up in
 * BACKLOG.md (E4).
 */
export const menuManifest: AppManifest = {
  slug: 'menu',
  name: 'Menu board',
  tagline: 'Show a menu or price list',
  description:
    'A clean board of items and prices — for cafés, canteens and shops. One item per line.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: MENU_ICON,
  color: '#16A34A',
  configSchema: [
    {
      key: 'heading',
      type: 'text',
      label: 'Heading',
      help: 'Shown at the top. Leave blank for just the list.',
      placeholder: "Today's Menu",
    },
    {
      key: 'items',
      type: 'textarea',
      label: 'Items',
      // The format is the whole trick of the MVP, so it's spelled out with an
      // example and the rule that the price/description are optional.
      help: 'One item per line, as "Name | Price | Description". The price and description are optional, e.g. "Espresso | 25 kr" or just "Soup of the day".',
      required: true,
      placeholder:
        'Espresso | 25 kr\nCappuccino | 35 kr | Oat milk on request\nCarrot cake | 40 kr',
    },
    {
      key: 'columns',
      type: 'select',
      label: 'Columns',
      help: 'Split a long list across two columns.',
      default: '1',
      options: [
        { label: 'One', value: '1' },
        { label: 'Two', value: '2' },
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
            backgroundColor: '#0B1220',
            textColor: '#E2E8F0',
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
      default: '#0B1220',
    },
    {
      key: 'textColor',
      type: 'color',
      label: 'Text colour',
      section: 'Theme Settings',
      default: '#E2E8F0',
    },
    {
      key: 'accentColor',
      type: 'color',
      label: 'Accent colour',
      section: 'Theme Settings',
      help: 'The heading and the prices.',
      default: DEFAULT_ACCENT,
    },
    ...styleFields(),
  ],
}
