import type { AppManifest } from '@edge/apps-contract'

const GCAL_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'

/**
 * Google Calendar — a `connected` app. The operator connects a Google account
 * (OAuth, Faza 3) and picks a calendar; the backend connector fetches upcoming
 * events on its behalf and fans them out. The `oauth` field stores the chosen
 * connection id. Data is fetched per-connection (private), never shared across
 * accounts.
 */
export const gcalManifest: AppManifest = {
  slug: 'gcal',
  name: 'Google Calendar',
  tagline: 'Show upcoming events from a Google Calendar',
  description:
    'Display the next events from a connected Google Calendar — great for meeting rooms and lobbies.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  refreshSeconds: 300,
  icon: GCAL_ICON,
  color: '#4285F4',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Google account',
      required: true,
    },
    {
      key: 'calendarId',
      type: 'text',
      label: 'Calendar ID',
      default: 'primary',
      help: 'Use "primary" for the main calendar, or a specific calendar id',
      placeholder: 'primary',
    },
    {
      key: 'maxEvents',
      type: 'number',
      label: 'Max events',
      default: 8,
      validation: { min: 1, max: 20 },
    },
  ],
}
