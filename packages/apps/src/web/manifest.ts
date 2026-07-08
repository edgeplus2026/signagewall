import type { AppManifest } from '@edge/apps-contract'

const WEB_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>'

/**
 * Web page / URL embed — show any website or dashboard on screen. Almost free
 * once the player is a generic iframe host. Pure client-side; the URL is the
 * only config.
 */
export const webManifest: AppManifest = {
  slug: 'web',
  name: 'Web page',
  tagline: 'Show any website or dashboard',
  description:
    'Embed any web page or live dashboard on your screens by URL.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  // Loads a live remote page in an iframe — blank/error without internet.
  requiresNetwork: true,
  icon: WEB_ICON,
  color: '#10B981',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Page URL',
      required: true,
      placeholder: 'https://example.com',
      help: 'The site must allow being embedded. Many sites (Google, social networks, most banking dashboards) block embedding and will show a blank screen — use a page or dashboard you control, or its public/embed URL.',
    },
  ],
}
