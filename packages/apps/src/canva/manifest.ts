import type { AppManifest } from '@signagewall/apps-contract'

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
    'Connect your Canva account and display any design, multi-page designs play as a slideshow and presentations/animations play as video. It re-exports automatically so the screen always shows the latest version.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 2,
  refreshSeconds: 900,
  // Renders the exported design straight from Canva's CDN — needs internet to
  // fetch the asset, so hide it offline rather than show a broken frame.
  requiresNetwork: true,
  /**
   * Holds one of the device's few video decoders while on screen. A Canva design can carry an embedded clip or animation, and the player
   * cannot see inside the embed to find out.
   * Signage hardware has very few — the measured Android TV advertises two —
   * and the engine uses this to avoid warming a second video behind it.
   */
  usesVideoDecoder: true,
  icon: CANVA_ICON,
  color: '#00C4CC',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Canva account',
      required: true,
      provider: 'canva',
      help: 'Sign in once. SignageWall then finds your designs for you.',
    },
    {
      key: 'design',
      type: 'remote-select',
      label: 'Design',
      required: true,
      remoteSource: 'canva-designs',
      placeholder: 'Search your designs…',
      // The auto-refresh is the thing operators do not expect and most want to
      // know: they can keep editing in Canva and the screen follows.
      help: 'Start typing to find one of your Canva designs. Edit it in Canva later and the screen catches up on its own.',
    },
    {
      key: 'slideDuration',
      type: 'number',
      label: 'Seconds per page',
      default: 8,
      validation: { min: 1 },
      help: 'Multi-page designs only. Videos and presentations play at their own pace.',
    },
    {
      key: 'maxPages',
      type: 'number',
      label: 'Pages to show',
      default: 0,
      validation: { min: 0 },
      help: 'Leave at 0 to show every page. Set a number to stop after that many.',
    },
  ],
}
