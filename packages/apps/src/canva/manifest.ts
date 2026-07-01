import type { AppManifest } from '@edge/apps-contract'

const CANVA_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9.5a3.5 3.5 0 10-1 5.8"/></svg>'

/**
 * Canva — a `connected` app. The operator connects a Canva account (OAuth +
 * PKCE, works for personal and business accounts) and picks a design from a
 * searchable, async dropdown that queries Canva live. The backend connector
 * asks Canva which formats the design supports and exports the best one — a
 * looping video for presentations/animations, or a per-page image slideshow for
 * multi-page designs. The access token is refreshed automatically on every fetch
 * so the content never goes stale.
 */
export const canvaManifest: AppManifest = {
  slug: 'canva',
  name: 'Canva',
  tagline: 'Show Canva designs, presentations and videos on your screens',
  description:
    'Connect your Canva account and display any design — multi-page designs play as a slideshow and presentations/animations play as video. It re-exports automatically so the screen always shows the latest version.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 2,
  refreshSeconds: 900,
  icon: CANVA_ICON,
  color: '#00C4CC',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Canva account',
      required: true,
      provider: 'canva',
    },
    {
      key: 'design',
      type: 'remote-select',
      label: 'Design',
      required: true,
      remoteSource: 'canva-designs',
      placeholder: 'Search your designs…',
      help: 'Search your templates and designs in Canva. The selected design will be displayed on your screens.',
    },
    {
      key: 'slideDuration',
      type: 'number',
      label: 'Seconds per page',
      default: 8,
      validation: { min: 1 },
      help: 'How long each page is shown in a multi-page slideshow. Videos play their own length.',
    },
    {
      key: 'maxPages',
      type: 'number',
      label: 'Max pages to show',
      default: 0,
      validation: { min: 0 },
      help: 'Limit how many pages of a multi-page design to show. Leave 0 to show all pages.',
    },
  ],
}
