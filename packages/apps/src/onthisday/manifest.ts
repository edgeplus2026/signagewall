import type { AppManifest } from '@edge/apps-contract'

import { styleFields } from '../_shared/style-fields.js'

const ONTHISDAY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7 3.3"/><path d="M3 4v3.5h3.5"/><path d="M12 8v4l3 2"/></svg>'

/**
 * On This Day — a `server` app backed by Wikipedia's On This Day feed (no API
 * key). Shows notable historical events that happened on today's date. The
 * connector resolves "today" on the server and fetches once per language, fanned
 * out to every screen; how many events show is display-only. Refreshed a few
 * times a day so it rolls over to the new day on its own.
 */
export const onthisdayManifest: AppManifest = {
  slug: 'onthisday',
  name: 'On this day',
  tagline: 'Historical events for today\'s date',
  description:
    'Show notable things that happened on today\'s date through history — engaging lobby and waiting-room content.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 21600,
  icon: ONTHISDAY_ICON,
  color: '#7C3AED',
  configSchema: [
    {
      key: 'language',
      type: 'select',
      label: 'Language',
      help: 'The Wikipedia edition the events come from.',
      default: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'German', value: 'de' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' },
      ],
    },
    {
      key: 'count',
      type: 'number',
      label: 'How many to show',
      help: 'The number of events to list.',
      default: 6,
      validation: { min: 1, max: 12 },
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
