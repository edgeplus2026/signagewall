import type { AppManifest } from '@signagewall/apps-contract'

import { DEFAULT_ACCENT } from '../_shared/theme.js'
import { DEFAULT_CLOCK_FACE, clockFaceOptions } from './faces.js'

const CLOCK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/**
 * Clock / Date — the most common signage app. Pure client-side: renders the
 * current time (and optionally the date) on the chosen face. `embed` runtime; no
 * server connector, and nothing to fetch — which is why it is the app that is still
 * right on a screen that has been off the network for a month.
 *
 * `face` is the app's spine: the faces live in `faces.ts` and each has a template
 * behind it in the embed. Adding one must not touch this file beyond the list it
 * already reads.
 */
export const clockManifest: AppManifest = {
  slug: 'clock',
  name: 'Clock',
  tagline: 'Show the current time on your screens',
  description:
    'Display a live clock — digital, analogue, split-flap, orbit, or spelled out in words.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 4,
  icon: CLOCK_ICON,
  color: '#0EA5E9',
  configSchema: [
    {
      key: 'face',
      type: 'select',
      label: 'Face',
      help: 'How the clock tells the time.',
      default: DEFAULT_CLOCK_FACE,
      options: clockFaceOptions(),
    },
    // Picking a theme fills the three colour fields below (overwriting any custom
    // values). It is a starting point, not a mode — the operator can still change
    // any of the three afterwards.
    //
    // A theme changes the BACKGROUND and the TEXT, never the accent: all three carry
    // the product accent, because it is the product's, not the theme's. Each one
    // still has to name it — the `set` is what refills the field, so a theme that
    // left `accentColor` out would leave a custom accent behind after a theme change
    // and quietly make itself a half-reset. See `_shared/theme.ts`.
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
      // Deliberately NOT gated with `visibleWhen`: that can only test one face
      // value, so it would silently hide this field the day a second face stopped
      // using it. The help carries the condition instead — the Words face rounds to
      // the nearest five minutes and has nowhere to put a second.
      help: 'Not used by the Words face, which tells the time to the nearest five minutes.',
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
      help: 'The second hand, the ticking colon, the ring that closes — the one thing on the face that moves.',
      default: DEFAULT_ACCENT,
    },
  ],
}
