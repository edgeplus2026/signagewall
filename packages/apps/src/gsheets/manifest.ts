import type { AppManifest } from '@signagewall/apps-contract'

const GSHEETS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/></svg>'

/**
 * Google Sheets — a `connected` app. The operator connects a Google account
 * (reusing the existing Google OAuth) and picks a spreadsheet from a searchable
 * dropdown that lists their Drive; the backend connector reads a cell range and
 * the embed shows it as a table or a single KPI. Refreshes automatically, so a
 * KPI board or a menu kept in a sheet stays current on the wall.
 *
 * Needs Google OAuth configured on the backend (`GOOGLE_CLIENT_ID`/`SECRET` +
 * `ENCRYPTION_KEY`) — the same prerequisite as Google Calendar. Its OAuth scopes
 * (Drive metadata + Sheets, read-only) are declared on the connector.
 */
export const gsheetsManifest: AppManifest = {
  slug: 'gsheets',
  name: 'Google Sheets',
  tagline: 'Put a Google Sheet on the wall',
  description:
    'Show a range from one of your Google Sheets as a live table or a single KPI — it refreshes on its own.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 2,
  refreshSeconds: 300,
  icon: GSHEETS_ICON,
  color: '#0F9D58',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Google account',
      required: true,
      provider: 'google',
      help: 'Sign in once — SignageWall then lists your spreadsheets to choose from.',
    },
    {
      key: 'spreadsheet',
      type: 'remote-select',
      label: 'Spreadsheet',
      required: true,
      remoteSource: 'google-sheets',
      placeholder: 'Search your spreadsheets…',
      help: 'Pick a spreadsheet from your Google Drive.',
    },
    /* No range field. It asked the operator to know A1 notation to get anything
       on screen at all, which is the wrong first question for someone who has
       just picked a spreadsheet — and the answer was almost always "the sheet".
       The connector reads a generous default instead. */
    {
      key: 'layout',
      type: 'select',
      label: 'Layout',
      default: 'modern',
      options: [
        { label: 'Modern', value: 'modern' },
        { label: 'Table', value: 'table' },
      ],
      help: 'Modern reads as a menu or price list. Table keeps the spreadsheet grid.',
    },
    {
      key: 'showHeader',
      type: 'switch',
      label: 'Show the header row',
      // The first row is always read as the heading; this only decides whether
      // it is drawn. A menu board rarely wants "Product name / Price" above it.
      help: 'Turn off to hide the column headings and start straight at the first item.',
      default: true,
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      default: 'dark',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
  ],
}
