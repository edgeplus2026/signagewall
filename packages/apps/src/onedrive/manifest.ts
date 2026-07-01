import type { AppManifest } from '@edge/apps-contract'

const ONEDRIVE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18a4 4 0 010-8 5 5 0 019.6-1.5A3.5 3.5 0 0118 18H6z"/></svg>'

/**
 * OneDrive document — a `connected` app (Microsoft). The operator connects a
 * Microsoft account and picks a file id; the backend connector resolves a
 * preview/download URL via Graph and the player shows it. Crucially, this app
 * drives the WEBHOOK live-sync: a Graph change-subscription on the item pushes a
 * refresh the moment the document changes (no polling lag).
 */
export const onedriveManifest: AppManifest = {
  slug: 'onedrive',
  name: 'OneDrive document',
  tagline: 'Always show the latest version of a OneDrive file',
  description:
    'Display an image or document from OneDrive — it updates on screen the moment the file changes.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  // Polling fallback; the webhook makes updates near-instant when configured.
  refreshSeconds: 900,
  icon: ONEDRIVE_ICON,
  color: '#0078D4',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Microsoft account',
      required: true,
      provider: 'microsoft',
    },
    {
      key: 'itemId',
      type: 'text',
      label: 'File ID',
      required: true,
      help: 'The OneDrive item id of the file to display',
    },
  ],
}
