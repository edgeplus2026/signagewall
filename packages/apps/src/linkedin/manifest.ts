import type { AppManifest } from '@edge/apps-contract'

const LINKEDIN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><path d="M7.5 10.5v7"/><path d="M11.5 17.5v-7"/><path d="M11.5 13.5a2.5 2.5 0 0 1 5 0v4"/></svg>'

/**
 * LinkedIn Page — a `connected` app on the LinkedIn provider. The operator
 * connects the LinkedIn account that ADMINISTERS the Page, picks one of the
 * Pages (organizations) they administer, and the backend fetches that Page's
 * recent published posts. The embed plays them through the shared social-feed
 * renderer, reusing the same spotlight/grid layouts as Instagram/Facebook/Teams.
 * Layout and theme are display-only, so instances sharing a Page share one
 * fetch. Data is per-connection.
 *
 * TEXT-ONLY, deliberately. LinkedIn's post payload references images as URNs
 * (`urn:li:image:…`) and resolving one to a URL means a GET on the Images API,
 * which LinkedIn gates behind a WRITE permission (`w_organization_social` /
 * `rw_ads`). Edge never asks for write access to an operator's Page, so posts
 * render as text heroes — the same treatment the social-feed embed already gives
 * Teams messages and Facebook text statuses. Article posts fold their title and
 * description into that text. Hence also NO `showCaption` field: with no image
 * posts there is no caption overlay for it to toggle, and a control that does
 * nothing is worse than no control.
 *
 * Because nothing in the payload is a rotating CDN link, it is stable and rides
 * in the player's cached snapshot — hence no `requiresNetwork` either.
 *
 * Needs LinkedIn OAuth configured on the backend (`LINKEDIN_CLIENT_ID`/`SECRET`
 * + `ENCRYPTION_KEY`) and the **Community Management API** product approved on
 * the LinkedIn app (`r_organization_admin` + `r_organization_social`). LinkedIn
 * gates those behind a partner review, so unlike Meta there is no dev-mode
 * shortcut even for Pages the operator owns.
 *
 * `refreshSeconds` is 900 rather than the 120 the other social apps use: a Page
 * posts far less often than an IG feed, and LinkedIn's quotas are per-app daily
 * caps that a 2-minute poll per connection would burn through.
 */
export const linkedinManifest: AppManifest = {
  slug: 'linkedin',
  name: 'LinkedIn Page',
  tagline: 'Show a LinkedIn Page feed on your screens',
  description:
    "Connect a LinkedIn account and display a Page's latest posts as a rotating spotlight or a grid.",
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  refreshSeconds: 900,
  icon: LINKEDIN_ICON,
  color: '#0A66C2',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'LinkedIn account',
      required: true,
      provider: 'linkedin',
      help: 'Sign in with the LinkedIn account that administers the Page. Edge only reads posts — it never posts on your behalf.',
    },
    {
      key: 'organization',
      type: 'remote-select',
      label: 'Page',
      required: true,
      remoteSource: 'linkedin-orgs',
      placeholder: 'Search your LinkedIn Pages…',
      help: 'Only Pages where your account is an approved administrator appear here.',
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
