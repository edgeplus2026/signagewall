import type { AppManifest } from '@edge/apps-contract'

const OUTLOOK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'

/**
 * Outlook Calendar — a `connected` app on the Microsoft provider (enabler E1).
 * The operator connects a Microsoft account and picks a calendar; the backend
 * connector fetches events from Microsoft Graph and NORMALIZES them to the shared
 * calendar payload, so this app reuses the Google Calendar embed wholesale — the
 * config keys below match gcal's exactly (`calendarView`, `onlyUpcoming`,
 * `autoScroll`, `language`, `theme`), which is what lets `embeds/outlook` re-use
 * `embeds/gcal`. Needs Microsoft OAuth configured (`MICROSOFT_CLIENT_ID`/`SECRET`
 * + `ENCRYPTION_KEY`).
 */
export const outlookManifest: AppManifest = {
  slug: 'outlook',
  name: 'Outlook Calendar',
  tagline: 'Show a Microsoft Outlook calendar on your screens',
  description:
    'Display a connected Microsoft Outlook / Microsoft 365 calendar as a day, week, month or schedule view — great for meeting rooms and lobbies.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  // Live updates arrive via the Graph webhook on the calendar's events (see the
  // connector's `webhookResource`). This slow poll is only the reconcile
  // fallback: first-save population, sliding the fetch window forward over time,
  // and recovering missed notifications or a deploy with no public webhook URL.
  refreshSeconds: 1800,
  icon: OUTLOOK_ICON,
  color: '#0078D4',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Microsoft account',
      required: true,
      provider: 'microsoft',
      // Read-only promise, kept in step with the connector scope (Calendars.Read).
      help: 'Sign in once. Edge only reads your calendars — it never adds, changes or deletes anything.',
    },
    {
      key: 'calendar',
      type: 'remote-select',
      label: 'Calendar',
      required: true,
      remoteSource: 'ms-calendars',
      placeholder: 'Search your calendars…',
      help: 'Start typing to find the calendar you want on screen.',
    },
    {
      key: 'calendarView',
      type: 'select',
      label: 'Calendar view',
      help: 'How events are laid out on the screen.',
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
      help: 'Events that have already ended drop off the list.',
      default: true,
      visibleWhen: { field: 'calendarView', equals: 'schedule' },
    },
    {
      key: 'autoScroll',
      type: 'switch',
      label: 'Auto scroll',
      default: false,
      help: 'Slowly scrolls the screen when there are more events than fit on it.',
    },
    {
      key: 'language',
      type: 'select',
      label: 'Language',
      help: "The language dates and events are shown in on the screen. It doesn't change this page.",
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
  ],
}
