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
    'Show a range from one of your Google Sheets as a live table or a single KPI. It refreshes on its own.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 5,
  /**
   * One minute, and it is the FAST path — not the fallback it reads like.
   *
   * The connector self-subscribes to Drive `files.watch`, but Google throttles
   * change notifications for a Sheet to roughly one per file per three minutes
   * (measured in production: three consecutive pings at 180.7 s and 186.6 s
   * spacing). Push therefore has a ~3 min floor no amount of code on our side
   * can lower, and at the old 300 s cadence the poll was slower still, so an
   * edit took minutes to reach the wall either way.
   *
   * A sheet is one cheap `values.get`, and Google's per-user read quota is 60/min
   * — a minute cadence uses one of them per sheet.
   */
  refreshSeconds: 60,
  icon: GSHEETS_ICON,
  color: '#0F9D58',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Google account',
      required: true,
      provider: 'google',
      help: 'Sign in once, then pick a spreadsheet in Google’s file picker.',
    },
    {
      key: 'spreadsheet',
      type: 'remote-select',
      label: 'Spreadsheet',
      required: true,
      remoteSource: 'google-sheets',
      // See `_shared/tabular-source.ts`: the picker keeps this app off the
      // restricted Drive scope, and off an annual CASA assessment with it.
      picker: 'google-drive',
      placeholder: 'Search your spreadsheets…',
      help: 'Pick a spreadsheet from your Google Drive.',
    },
    /* No range field. It asked the operator to know A1 notation to get anything
       on screen at all, which is the wrong first question for someone who has
       just picked a spreadsheet — and the answer was almost always "the sheet".
       The connector reads a generous default instead. */
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
      key: 'pageSeconds',
      type: 'number',
      label: 'Seconds per page',
      default: 20,
      validation: { min: 3, max: 300 },
      // Only matters when the sheet is taller than the screen. A sheet that fits
      // draws no page indicator and never advances, whatever this says.
      //
      // The other half of that, which is the one operators actually hit: paging
      // is bounded by how long the app is ON the screen. Set this to 20 s on a
      // slot that runs for 15 s and page two is never reached — the app leaves
      // before the timer fires, and nothing anywhere says so. The embed cannot
      // clamp it itself; the slot duration is not part of the config handshake.
      help: 'How long each page of rows stays up when the sheet is too long to fit on screen at once. Keep it shorter than the time this app runs for on the screen, or the later pages are never reached.',
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
