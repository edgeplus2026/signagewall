import type { AppManifest } from '@signagewall/apps-contract'

const TEAMS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8a3 3 0 1 0 0-.01"/><path d="M4 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2"/><path d="M16 3.5a2.5 2.5 0 1 1 0 5"/><path d="M15 14h4a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1"/></svg>'

/**
 * Microsoft Teams — a `connected` app on the Microsoft provider (reuses the
 * Outlook/Entra OAuth). The operator connects a Microsoft account, picks one
 * channel from a searchable "Team · Channel" dropdown, and the backend fetches
 * that channel's recent messages. A channel is a feed of authored posts, so the
 * embed reuses the shared social-feed renderer (spotlight/grid) with per-message
 * bylines. Layout, "show author names" and theme are display-only, so instances
 * sharing a channel share one fetch. Data is per-connection.
 *
 * Needs Microsoft OAuth configured on the backend (`MICROSOFT_CLIENT_ID`/`SECRET`
 * + `ENCRYPTION_KEY`). Reading channel messages uses the `ChannelMessage.Read.All`
 * scope, which requires Azure AD ADMIN CONSENT; personal Microsoft accounts are
 * not supported.
 */
export const teamsManifest: AppManifest = {
  slug: 'teams',
  name: 'Microsoft Teams',
  tagline: 'Show a Teams channel on your screens',
  description:
    "Connect a Microsoft account and display a Teams channel's latest messages and announcements as a rotating spotlight or a grid.",
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  /**
   * Ten minutes, not two.
   *
   * A page posts a handful of times a week; polling it every two minutes asked the
   * provider thirty times more often than the content could possibly change, and
   * every screen on that account shared the answer anyway (one cache key, one
   * fetch). What the short cadence actually bought was rate-limit exposure — the
   * social payload note warns that these tokens 403 within hours if leaned on — for
   * a feed nobody would notice arriving eight minutes later on a wall.
   */
  refreshSeconds: 600,
  icon: TEAMS_ICON,
  color: '#6264A7',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Microsoft account',
      required: true,
      provider: 'microsoft',
      help: 'Sign in with a work or school account. SignageWall only reads channel messages. It never posts. Your Microsoft admin must approve message access the first time.',
    },
    {
      key: 'channel',
      type: 'remote-select',
      label: 'Channel',
      required: true,
      remoteSource: 'ms-teams-channels',
      placeholder: 'Search your teams and channels…',
      help: 'Only teams you are a member of and their channels appear here.',
    },
    {
      key: 'layout',
      type: 'select',
      label: 'Layout',
      default: 'spotlight',
      previewGallery: 'social',
      options: [
        { label: 'Spotlight (one message at a time)', value: 'spotlight' },
        { label: 'Grid', value: 'grid' },
      ],
    },
    {
      key: 'slideSeconds',
      type: 'number',
      label: 'Seconds per message',
      help: 'How long each message stays up in Spotlight.',
      default: 8,
      validation: { min: 2, max: 120 },
      visibleWhen: { field: 'layout', equals: 'spotlight' },
    },
    {
      key: 'showCaption',
      type: 'switch',
      label: 'Show author names',
      default: true,
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
