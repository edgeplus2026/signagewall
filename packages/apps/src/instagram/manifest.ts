import type { AppManifest } from '@edge/apps-contract'

const INSTAGRAM_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'

/**
 * Instagram — a `connected` app on the Meta provider. The operator connects a
 * Facebook account that manages a Page with a linked professional (Business/
 * Creator) Instagram account, picks the IG account, and the backend fetches its
 * recent media. The embed plays it as a rotating spotlight or a grid. Layout,
 * caption visibility and theme are display-only (applied by the embed), so
 * instances sharing an account share one fetch. Data is per-connection.
 *
 * Needs Meta OAuth configured on the backend (`META_CLIENT_ID`/`SECRET` +
 * `ENCRYPTION_KEY`) and — for accounts you do not own — the `instagram_basic`
 * permission cleared through Meta App Review. It streams images from Meta's CDN,
 * so it `requiresNetwork`.
 */
export const instagramManifest: AppManifest = {
  slug: 'instagram',
  name: 'Instagram',
  tagline: 'Show an Instagram feed on your screens',
  description:
    'Connect a professional Instagram account and display its latest posts as a rotating spotlight or a grid.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  refreshSeconds: 900,
  requiresNetwork: true,
  icon: INSTAGRAM_ICON,
  color: '#E1306C',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Facebook account',
      required: true,
      provider: 'meta',
      help: 'Sign in with the Facebook account that manages your Instagram. Edge only reads posts — it never posts, likes or messages.',
    },
    {
      key: 'account',
      type: 'remote-select',
      label: 'Instagram account',
      required: true,
      remoteSource: 'meta-ig-accounts',
      placeholder: 'Search your Instagram accounts…',
      help: 'Only professional (Business or Creator) accounts linked to a Page appear here.',
    },
    {
      key: 'layout',
      type: 'select',
      label: 'Layout',
      default: 'spotlight',
      options: [
        { label: 'Spotlight (one post at a time)', value: 'spotlight' },
        { label: 'Grid', value: 'grid' },
      ],
    },
    {
      key: 'slideSeconds',
      type: 'number',
      label: 'Seconds per post',
      help: 'How long each post stays up in Spotlight.',
      default: 8,
      validation: { min: 2, max: 120 },
      visibleWhen: { field: 'layout', equals: 'spotlight' },
    },
    {
      key: 'showCaption',
      type: 'switch',
      label: 'Show captions',
      default: true,
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      section: 'Theme Settings',
      default: 'dark',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
  ],
}
