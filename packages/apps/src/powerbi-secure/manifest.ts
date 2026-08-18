import type { AppManifest } from '@signagewall/apps-contract'

import { POWERBI_SECURE_DEFAULTS } from './config.js'

const POWERBI_SECURE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="7" width="3" height="11" rx="1"/><rect x="16" y="13" width="3" height="5" rx="1"/><rect x="8" y="2.5" width="8" height="6" rx="2"/><path d="M10 2.5V2a2 2 0 0 1 4 0v.5"/></svg>'

export const POWERBI_SECURE_REMOTE_SOURCES = {
  workspaces: 'powerbi-workspaces',
  reports: 'powerbi-reports',
  pages: 'powerbi-pages',
} as const

/**
 * Private, snapshot-based Power BI. The backend exports report pages into the
 * tenant-private asset store and the authorized delivery boundary hydrates
 * short-lived image URLs. This is deliberately separate from the public
 * `powerbi` publish-to-web app and does not receive an OAuth or embed token.
 */
export const powerbiSecureManifest: AppManifest = {
  slug: 'powerbi-secure',
  name: 'Power BI Secure',
  tagline: 'Private Power BI snapshots for unattended screens',
  description:
    'Connect Microsoft, choose a private Power BI report and show securely exported page snapshots that keep playing from the last successful export when the source or internet is unavailable.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  // The connector may honor a longer per-instance refreshMinutes value. This
  // manifest cadence is the scheduler fallback and matches the default.
  refreshSeconds: POWERBI_SECURE_DEFAULTS.refreshMinutes * 60,
  // Snapshot assets are prefetched/cached by the player. Do not mark this app as
  // requiring a live network; that would hide last-known-good pages offline.
  icon: POWERBI_SECURE_ICON,
  color: '#F2C811',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Microsoft account',
      required: true,
      provider: 'microsoft',
      help: 'Sign in with read-only Power BI permissions. SignageWall never changes reports, datasets or workspaces.',
    },
    {
      key: 'workspace',
      type: 'remote-select',
      label: 'Power BI workspace',
      required: true,
      remoteSource: POWERBI_SECURE_REMOTE_SOURCES.workspaces,
      placeholder: 'Search workspaces…',
      help: 'Snapshot export requires supported Premium, Embedded or Fabric dedicated capacity. Premium Per User (PPU) is not supported, and tenant export settings can still block export.',
    },
    {
      key: 'report',
      type: 'remote-select',
      label: 'Report',
      required: true,
      remoteSource: POWERBI_SECURE_REMOTE_SOURCES.reports,
      remoteParams: { workspaceId: 'workspace' },
      placeholder: 'Choose a workspace first…',
      help: 'Choose a report from the selected workspace. The CMS must clear this selection when the workspace changes.',
    },
    {
      key: 'page',
      type: 'remote-select',
      label: 'Report page',
      remoteSource: POWERBI_SECURE_REMOTE_SOURCES.pages,
      remoteParams: { workspaceId: 'workspace', reportId: 'report' },
      placeholder: 'All report pages',
      help: 'Optional. Leave empty to export every supported report page, or choose one page for a static dashboard screen.',
    },
    {
      key: 'refreshMinutes',
      type: 'number',
      label: 'Export every (minutes)',
      default: POWERBI_SECURE_DEFAULTS.refreshMinutes,
      validation: { min: 5, max: 1440 },
      help: 'How often SignageWall requests a new server-side snapshot. The last successful export remains on screen while an export is pending or fails.',
    },
    {
      key: 'fit',
      type: 'select',
      label: 'Fit to screen',
      default: POWERBI_SECURE_DEFAULTS.fit,
      options: [
        { label: 'Fit whole page (letterbox)', value: 'contain' },
        { label: 'Fill screen (crop edges)', value: 'cover' },
      ],
    },
    {
      key: 'background',
      type: 'color',
      label: 'Letterbox colour',
      default: POWERBI_SECURE_DEFAULTS.background,
      help: 'Colour shown around an exported page when its aspect ratio does not match the screen.',
    },
  ],
}
