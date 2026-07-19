import type { AppManifest } from '@edge/apps-contract'

import { styleFields } from '../_shared/style-fields.js'

const SUNMOON_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="3.2"/><path d="M8 4v1.4M8 18.6V20M2 12h1.4M12.6 12H14M4.3 8.3l1 1M4.3 15.7l1-1"/><path d="M21 14.5A5.5 5.5 0 0 1 14.5 8a5.5 5.5 0 1 0 6.5 6.5z"/></svg>'

/**
 * Sun & Moon — a `server` app backed by Open-Meteo (no API key), the same
 * provider as Weather and Air quality. Shows today's sunrise, sunset and day
 * length for a place, a live day-progress bar, and the current moon phase. The
 * connector fetches once per coarse location and fans it out; the moon phase is
 * computed in the bundle (it is the same everywhere at a given moment).
 */
export const sunmoonManifest: AppManifest = {
  slug: 'sunmoon',
  name: 'Sun & Moon',
  tagline: 'Sunrise, sunset and the moon phase',
  description:
    'Show today\'s sunrise, sunset and day length for a place, plus the current moon phase — updated automatically.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 21600,
  icon: SUNMOON_ICON,
  color: '#4F46E5',
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
