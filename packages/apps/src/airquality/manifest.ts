import type { AppManifest } from '@signagewall/apps-contract'

const AIR_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h11a3 3 0 1 0-3-3"/><path d="M2 14h15a3 3 0 1 1-3 3"/><path d="M18 10.5a2.5 2.5 0 1 1 2 4"/></svg>'

/**
 * Air quality — a `server` app backed by the Open-Meteo Air Quality API (no key),
 * the same provider as Weather, so a screen can pair the two. The connector
 * fetches once per coarse location and fans it out. Both the European and US AQI
 * travel in the payload; the operator chooses which to show, and that choice is
 * display-only (it never splits the cache).
 */
export const airqualityManifest: AppManifest = {
  slug: 'airquality',
  name: 'Air quality',
  tagline: 'Live air quality for any location',
  description:
    'Show the current air-quality index and key pollutants for a place — updated automatically.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 900,
  icon: AIR_ICON,
  color: '#14B8A6',
  configSchema: [
    {
      key: 'location',
      type: 'location',
      label: 'Location',
      required: true,
      placeholder: 'Search a city…',
      help: 'Start typing and pick a place from the list.',
    },
    {
      key: 'scale',
      type: 'select',
      label: 'Index',
      help: 'Which air-quality scale to show.',
      default: 'european',
      options: [
        { label: 'European (EAQI)', value: 'european' },
        { label: 'US (AQI)', value: 'us' },
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
  ],
}
