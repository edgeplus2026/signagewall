import type { AppManifest } from '@edge/apps-contract'

const COUNTDOWN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4M12 8v6M12 22a8 8 0 100-16 8 8 0 000 16z"/></svg>'

/**
 * Countdown — counts down to an event/promo time. Pure client-side: the target
 * time is in the config and the remaining time ticks in the browser.
 */
export const countdownManifest: AppManifest = {
  slug: 'countdown',
  name: 'Countdown',
  tagline: 'Count down to an event',
  description: 'Display a live countdown to a date and time you choose.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: COUNTDOWN_ICON,
  color: '#F59E0B',
  configSchema: [
    {
      key: 'targetAt',
      type: 'text',
      label: 'Target date & time (ISO)',
      required: true,
      help: 'e.g. 2026-12-31T23:59',
      placeholder: '2026-12-31T23:59',
    },
    {
      key: 'label',
      type: 'text',
      label: 'Label',
      placeholder: 'New Year',
    },
  ],
}
