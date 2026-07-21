import type { AppManifest } from '@edge/apps-contract'

import { AREA_OPTIONS, DEFAULT_AREA } from './areas.js'

const POWER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>'

/**
 * Electricity spot prices — a `server` app backed by energy-charts.info's open
 * day-ahead price data (no API key), covering Serbia and the popular European
 * markets. Shows the current day-ahead spot price and today's hourly curve for a
 * price area. The connector fetches once per area (in the area's timezone) and
 * fans it out; prices travel in EUR, formatted per kWh by the embed.
 */
export const powerPricesManifest: AppManifest = {
  slug: 'power-prices',
  name: 'Electricity prices',
  tagline: 'Live electricity spot prices',
  description:
    "Show the current electricity spot price and today's hourly price curve for a country or market area.",
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 2,
  refreshSeconds: 1800,
  icon: POWER_ICON,
  color: '#EAB308',
  configSchema: [
    {
      key: 'area',
      type: 'select',
      label: 'Price area',
      // The market is the country's day-ahead bidding zone — not their retail
      // bill. Say that plainly so nobody reads a low spot price as their tariff.
      help: 'The country or market whose day-ahead wholesale prices to show. Start typing to find yours.',
      default: DEFAULT_AREA,
      searchable: true,
      options: AREA_OPTIONS,
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
