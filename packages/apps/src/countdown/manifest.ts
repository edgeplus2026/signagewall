import type { AppManifest } from '@signagewall/apps-contract'

import { DEFAULT_ACCENT } from '../_shared/theme.js'

const COUNTDOWN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 13V9"/><path d="M9 2h6"/><path d="M19.5 5.5 18 7"/></svg>'

/**
 * Countdown / Timer — pure client-side (`static`), so it keeps ticking on a
 * screen that has been off the network for a month. Counts *down* to a moment
 * (a launch, an opening, New Year) or *up* since one ("N days without an
 * incident"). The target is the app's spine; everything else is presentation.
 *
 * The target uses the `datetime` field — a native date/time picker — and is
 * stored as a local ISO string (`YYYY-MM-DDTHH:MM`), which the embed parses as
 * the screen's local wall time.
 */
export const countdownManifest: AppManifest = {
  slug: 'countdown',
  name: 'Countdown',
  tagline: 'Count down to a moment, or up since one',
  description:
    'Show a live countdown to an event, or count up since a date. Ticks on its own, on or offline.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: COUNTDOWN_ICON,
  color: '#8B5CF6',
  configSchema: [
    {
      key: 'title',
      type: 'text',
      label: 'Title',
      help: 'Shown above the timer. Leave blank for just the numbers.',
      placeholder: 'New Year',
    },
    {
      key: 'target',
      type: 'datetime',
      label: 'Date & time',
      // The picker gives a local time with no zone; say which clock that is, since
      // a screen may stand in a different timezone than whoever set it.
      help: "The moment to count to. The screen's local time.",
      required: true,
    },
    {
      key: 'mode',
      type: 'select',
      label: 'Direction',
      default: 'down',
      options: [
        { label: 'Count down to it', value: 'down' },
        { label: 'Count up since it', value: 'up' },
      ],
    },
    {
      key: 'finishedText',
      type: 'text',
      label: 'Message at zero',
      // Say plainly that this only applies to a countdown — a count-up never ends,
      // so the field would otherwise read as broken for half the app's users.
      help: 'Shown when a countdown reaches zero (e.g. "Happy New Year!"). A count-up ignores it.',
      placeholder: "Happy New Year!",
    },
    {
      key: 'showLabels',
      type: 'switch',
      label: 'Show unit labels',
      help: 'The Days / Hours / Mins / Secs captions under each number.',
      default: true,
    },
    // Picking a theme fills the three colour fields below (overwriting any custom
    // values), exactly like the Clock app. A theme sets background and text; the
    // accent is the product accent and stays across themes.
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      help: 'A starting point. It fills in the colours below, which you can still change.',
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
      help: 'The unit labels and the message at zero.',
      default: DEFAULT_ACCENT,
    },
  ],
}
