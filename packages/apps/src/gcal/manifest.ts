import type { AppManifest } from '@signagewall/apps-contract'

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
    'Display a connected Google Calendar as a day, week, month or schedule view, great for meeting rooms and lobbies.',
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
      // The read-only promise is the first thing a non-technical operator wants
      // answered before they hand over a Google account. It is true — the OAuth
      // scope is `calendar.readonly` (see gcal.connector.ts). Keep the two in
      // step: if the scope ever widens, this sentence has to go.
      help: 'Sign in once. SignageWall only reads your calendars. It never adds, changes or deletes anything.',
    },
    {
      key: 'calendar',
      type: 'remote-select',
      label: 'Calendar',
      required: true,
      remoteSource: 'google-calendars',
      placeholder: 'Search your calendars…',
      help: 'Start typing to find the calendar you want on screen.',
    },
    {
      key: 'calendarView',
      type: 'select',
      label: 'Calendar view',
      help: 'How events are laid out on the screen.',
      default: 'schedule',
      // Shared with Outlook, which renders through this same embed.
      previewGallery: 'calendar',
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
      // Operators reasonably read a bare "Language" as the CMS's own language.
      // Say which one it is.
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
    // No accent colour field, and its absence is the design.
    //
    // A calendar is a page that is ALL content: every cell carries an event. An
    // accent there does not mark ONE thing — it tints the whole screen, and a wall
    // of a single hue stops meaning "look here" the moment everything is it. The
    // views are drawn in one ink: a ruled grid, the weight of the type, and a
    // single filled disc on today. Handing the operator a colour picker would only
    // let them undo that.
  ],
}
