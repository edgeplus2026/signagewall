import type { AppManifest } from '@edge/apps-contract'

const GCAL_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'

/**
 * Google Calendar — a `connected` app. The operator connects a Google account
 * (OAuth + refresh, per-instance) and picks a calendar from a searchable async
 * dropdown; the backend connector fetches a broad event window and the embed
 * renders it as a day / week / month / schedule view. View, language, theme and
 * auto-scroll are display-only (applied by the embed), so instances sharing a
 * calendar share one fetch. Data is per-connection (private), never shared.
 */
export const gcalManifest: AppManifest = {
  slug: 'gcal',
  name: 'Google Calendar',
  tagline: 'Show a Google Calendar on your screens',
  description:
    'Display a connected Google Calendar as a day, week, month or schedule view — great for meeting rooms and lobbies.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 4,
  refreshSeconds: 300,
  icon: GCAL_ICON,
  color: '#4285F4',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Google account',
      required: true,
      provider: 'google',
    },
    {
      key: 'calendar',
      type: 'remote-select',
      label: 'Calendar',
      required: true,
      remoteSource: 'google-calendars',
      placeholder: 'Search your calendars…',
      help: 'Pick which of the account’s calendars to display.',
    },
    {
      key: 'calendarView',
      type: 'select',
      label: 'Calendar view',
      default: 'schedule',
      options: [
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
        { label: 'Month', value: 'month' },
        { label: 'Schedule', value: 'schedule' },
      ],
    },
    {
      key: 'onlyUpcoming',
      type: 'switch',
      label: 'Only show upcoming events',
      default: true,
      visibleWhen: { field: 'calendarView', equals: 'schedule' },
    },
    {
      key: 'autoScroll',
      type: 'switch',
      label: 'Auto scroll',
      default: false,
      help: 'Slowly scroll the content when it overflows the screen.',
    },
    {
      key: 'language',
      type: 'select',
      label: 'Language',
      default: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Serbian', value: 'sr' },
      ],
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      section: 'Theme Settings',
      default: 'light',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    {
      key: 'accentColor',
      type: 'color',
      label: 'Accent color',
      section: 'Theme Settings',
      default: '#111827',
    },
  ],
}
