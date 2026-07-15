import type { AppManifest } from '@edge/apps-contract'

import { DEFAULT_ACCENT } from '../_shared/theme.js'
import { styleFields } from '../_shared/style-fields.js'

const WORLDCLOCK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z"/></svg>'

/**
 * World clocks — the current time in several places at once, for lobbies and
 * offices spanning time zones. Pure client-side (`static`): it ticks from the
 * player's own clock and each zone is computed with `Intl`, so it keeps perfect
 * time offline.
 *
 * Zones are one-per-line (`Label | Zone`) for now — a `textarea` — because there
 * is no repeater field yet. The follow-up (BACKLOG.md E4) is a row editor with a
 * searchable time-zone picker, so operators don't have to know IANA names.
 */
export const worldclockManifest: AppManifest = {
  slug: 'worldclock',
  name: 'World clocks',
  tagline: 'The time in several places at once',
  description:
    'Show the current time in multiple cities. One place per line as "Label | Zone".',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: WORLDCLOCK_ICON,
  color: '#0891B2',
  configSchema: [
    {
      key: 'clocks',
      type: 'textarea',
      label: 'Places',
      // The IANA-name requirement is the sharp edge of the MVP; give real examples
      // and say where the names come from.
      help: 'One place per line as "Label | Zone". Zone is an IANA name, e.g. "London | Europe/London", "New York | America/New_York", "Tokyo | Asia/Tokyo".',
      required: true,
      placeholder:
        'Copenhagen | Europe/Copenhagen\nNew York | America/New_York\nTokyo | Asia/Tokyo',
    },
    {
      key: 'format',
      type: 'select',
      label: 'Time format',
      section: 'Clock Settings',
      default: '24h',
      options: [
        { label: '24-hour (14:30)', value: '24h' },
        { label: '12-hour (2:30 PM)', value: '12h' },
      ],
    },
    {
      key: 'showSeconds',
      type: 'switch',
      label: 'Show seconds',
      section: 'Clock Settings',
      default: false,
    },
    {
      key: 'showDate',
      type: 'switch',
      label: 'Show date',
      section: 'Clock Settings',
      default: true,
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
        {
          label: 'Midnight',
          value: 'midnight',
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
      help: 'The place labels.',
      default: DEFAULT_ACCENT,
    },
    ...styleFields(),
  ],
}
