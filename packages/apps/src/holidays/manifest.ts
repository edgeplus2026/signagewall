import type { AppManifest } from '@signagewall/apps-contract'

import { COUNTRY_OPTIONS } from './countries.js'

const HOLIDAYS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M12 13v4M10 15h4"/></svg>'

/**
 * Public holidays — a `server` app backed by Nager.Date (no API key). Shows the
 * upcoming public holidays for a country. The connector fetches once per country
 * and fans it out; how many to show is display-only and never splits the cache.
 * Refreshed a few times a day — a holiday list changes slowly.
 */
export const holidaysManifest: AppManifest = {
  slug: 'holidays',
  name: 'Public holidays',
  tagline: 'Upcoming public holidays',
  description:
    'Show the next public holidays for a country — handy for offices, lobbies and staff areas.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 2,
  refreshSeconds: 21600,
  icon: HOLIDAYS_ICON,
  color: '#E11D48',
  configSchema: [
    {
      key: 'country',
      type: 'select',
      label: 'Country',
      help: 'Whose public holidays to show. Start typing to find a country.',
      default: 'RS',
      searchable: true,
      options: COUNTRY_OPTIONS,
    },
    {
      key: 'count',
      type: 'number',
      label: 'How many to show',
      help: 'The number of upcoming holidays to list (1–12).',
      default: 5,
      validation: { min: 1, max: 12 },
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      help: 'The overall colour scheme of the screen.',
      default: 'dark',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
  ],
}
