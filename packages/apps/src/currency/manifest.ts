import type { AppManifest } from '@edge/apps-contract'

import { CURRENCY_OPTIONS } from './currencies.js'

const CURRENCY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5a3 3 0 0 0-2.5-1.5c-1.7 0-3 1.1-3 2.5s1.3 2 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5a3 3 0 0 1-2.5-1.5"/><path d="M12 6.5v11"/></svg>'

/**
 * Currency / exchange rates — a `server` app backed by the open currency-api
 * dataset (no API key; quotes far more than the ECB set, incl. RSD/BAM/MKD).
 * The connector fetches once per base+targets set and fans it out, so many
 * screens showing the same rates cost one upstream call. Rates are published
 * once per day, so the refresh is hourly — enough to pick up the new day's
 * rates promptly without hammering.
 *
 * Rates are neutral numbers; the embed formats them per the display config.
 */
export const currencyManifest: AppManifest = {
  slug: 'currency',
  name: 'Exchange rates',
  tagline: 'Live currency exchange rates',
  description:
    'Show exchange rates from a base currency to the ones you choose — updated automatically every day.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 3600,
  icon: CURRENCY_ICON,
  color: '#22C55E',
  configSchema: [
    {
      key: 'base',
      type: 'select',
      label: 'Base currency',
      help: 'Rates are shown as how much of each currency one unit of this buys.',
      default: 'EUR',
      searchable: true,
      options: CURRENCY_OPTIONS,
    },
    {
      key: 'targets',
      type: 'multiselect',
      label: 'Show rates for',
      help: 'The currencies to display against the base.',
      default: ['USD', 'GBP', 'DKK'],
      validation: { min: 1, max: 12 },
      options: CURRENCY_OPTIONS,
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
  ],
}
