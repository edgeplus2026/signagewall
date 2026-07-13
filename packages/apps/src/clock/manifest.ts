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
  version: 3,
  icon: CLOCK_ICON,
  color: '#0EA5E9',
  configSchema: [
    // First (untitled) section — the theme preset. Picking an option fills the
    // Background/Text color fields below (overwriting any custom values).
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      help: 'A starting point — it fills in the colors below, which you can still change.',
      default: 'dark',
      options: [
        {
          label: 'Light',
          value: 'light',
          set: { backgroundColor: '#FFFFFF', textColor: '#000000' },
        },
        {
          label: 'Dark',
          value: 'dark',
          set: { backgroundColor: '#000000', textColor: '#FFFFFF' },
        },
      ],
    },
    {
      key: 'format',
      type: 'select',
      label: 'Time format',
      section: 'Clock Settings',
      default: '24h',
      // Showing the format rather than naming it — "14:30" answers the question
      // faster than "24-hour" does, and needs no help text under it.
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
    // Filled by the theme; edit for a custom colour (re-picking a theme resets).
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Background color',
      section: 'Theme Settings',
      default: '#000000',
    },
    {
      key: 'textColor',
      type: 'color',
      label: 'Text color',
      section: 'Theme Settings',
      default: '#FFFFFF',
    },
  ],
}
