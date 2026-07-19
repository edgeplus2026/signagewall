import type { AppManifest } from '@edge/apps-contract'

import { styleFields } from '../_shared/style-fields.js'

const SPORTS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3l2.5 4.5L12 12l-2.5-4.5z"/><path d="M21 12h-5l-4 4M3 12h5l4-4M12 21v-5"/></svg>'

/**
 * Sports — a `server` app showing a team's upcoming fixtures and recent results
 * via TheSportsDB. It reads `THESPORTSDB_API_KEY` from the backend env (enabler
 * E5) but defaults to the free public test key, so it works out of the box and
 * can be upgraded to a personal key for higher limits. The connector resolves the
 * team by name, fetches both fixtures and results under one team-only cache key,
 * and fans it out.
 */
export const sportsManifest: AppManifest = {
  slug: 'sports',
  name: 'Sports',
  tagline: 'Fixtures and results for your team',
  description:
    'Show a team\'s upcoming fixtures and recent results — football and many other sports.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 600,
  icon: SPORTS_ICON,
  color: '#2563EB',
  configSchema: [
    {
      key: 'team',
      type: 'text',
      label: 'Team',
      help: 'The team name to follow, e.g. "Arsenal", "FC Copenhagen", "LA Lakers".',
      required: true,
      placeholder: 'Arsenal',
    },
    {
      key: 'mode',
      type: 'select',
      label: 'Show',
      default: 'upcoming',
      options: [
        { label: 'Upcoming fixtures', value: 'upcoming' },
        { label: 'Recent results', value: 'results' },
        { label: 'Both', value: 'both' },
      ],
    },
    {
      key: 'count',
      type: 'number',
      label: 'How many',
      help: 'How many fixtures / results to list (per section).',
      default: 5,
      validation: { min: 1, max: 10 },
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
