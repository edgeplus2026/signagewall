import type { AppManifest } from '@edge/apps-contract'

const FACEBOOK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M15 8h-2a2 2 0 0 0-2 2v2m-2 0h6m-4 0v6"/></svg>'

/**
 * Facebook Page — a `connected` app on the Meta provider. The operator connects
 * a Facebook account, picks a Page they manage, and the backend fetches the
 * Page's recent published posts. The embed plays them as a rotating spotlight or
 * a grid, reusing the same renderer as Instagram (both reduce to an account +
 * a list of posts). Layout, caption visibility and theme are display-only, so
 * instances sharing a Page share one fetch. Data is per-connection.
 *
 * Needs Meta OAuth configured on the backend (`META_CLIENT_ID`/`SECRET` +
 * `ENCRYPTION_KEY`) and — for Pages you do not own — the `pages_read_engagement`
 * permission cleared through Meta App Review. It streams images from Meta's CDN,
 * so it `requiresNetwork`.
 */
export const facebookManifest: AppManifest = {
  slug: 'facebook',
  name: 'Facebook Page',
  tagline: 'Show a Facebook Page feed on your screens',
  description:
    "Connect a Facebook account and display a Page's latest posts as a rotating spotlight or a grid.",
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  refreshSeconds: 120,
  requiresNetwork: true,
  icon: FACEBOOK_ICON,
  color: '#1877F2',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Facebook account',
      required: true,
      provider: 'meta',
      help: 'Sign in with the Facebook account that manages the Page. Edge only reads posts — it never posts on your behalf.',
    },
    {
      key: 'page',
      type: 'remote-select',
      label: 'Page',
      required: true,
      remoteSource: 'meta-pages',
      placeholder: 'Search your Pages…',
      help: 'Only Pages your account manages appear here.',
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
      label: 'Show post text',
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
