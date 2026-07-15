import type { AppManifest } from '@edge/apps-contract'

import { styleFields } from '../_shared/style-fields.js'
import { AREA_OPTIONS } from './areas.js'

const POWER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>'

/**
 * Electricity spot prices — a `server` app backed by Energinet's open
 * Elspotprices dataset (no API key). Shows the current day-ahead spot price and
 * today's hourly curve for a Nord Pool price area. The connector fetches once per
 * area and fans it out; both DKK and EUR travel in the payload, so the currency
 * choice is display-only and never splits the cache.
 */
export const powerPricesManifest: AppManifest = {
  slug: 'power-prices',
  name: 'Electricity prices',
  tagline: 'Live electricity spot prices',
  description:
    'Show the current electricity spot price and today\'s hourly curve for a price area — from Energinet.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 1800,
  icon: POWER_ICON,
  color: '#EAB308',
  configSchema: [
    {
      key: 'area',
      type: 'select',
      label: 'Price area',
      help: 'Which electricity market area to show prices for.',
      default: 'DK1',
      options: AREA_OPTIONS,
    },
    {
      key: 'currency',
      type: 'select',
      label: 'Currency',
      default: 'DKK',
      options: [
        { label: 'DKK (øre/kWh)', value: 'DKK' },
        { label: 'EUR (cents/kWh)', value: 'EUR' },
      ],
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
    ...styleFields(),
  ],
}
