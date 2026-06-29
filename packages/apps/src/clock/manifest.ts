import type { AppManifest } from '@edge/apps-contract'

const CLOCK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/**
 * Clock / Date — the most common signage app. Pure client-side: renders the
 * current time (and optionally the date) in the configured format. `embed`
 * runtime; no server connector.
 */
export const clockManifest: AppManifest = {
  slug: 'clock',
  name: 'Clock',
  tagline: 'Show the current time on your screens',
  description:
    'Display a live clock — 12- or 24-hour, with optional seconds and date.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: CLOCK_ICON,
  color: '#0EA5E9',
  configSchema: [
    {
      key: 'format',
      type: 'select',
      label: 'Time format',
      default: '24h',
      options: [
        { label: '24-hour', value: '24h' },
        { label: '12-hour', value: '12h' },
      ],
    },
    {
      key: 'showSeconds',
      type: 'switch',
      label: 'Show seconds',
      default: false,
    },
    {
      key: 'showDate',
      type: 'switch',
      label: 'Show date',
      default: true,
    },
  ],
}
