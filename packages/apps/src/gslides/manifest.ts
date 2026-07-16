import type { AppManifest } from '@edge/apps-contract'

const GSLIDES_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><rect x="7" y="8" width="10" height="6" rx="1"/><path d="M8 21h8M12 18v3"/></svg>'

/**
 * Google Slides (private) — a `connected` app for decks you do NOT publish to the
 * web. The operator connects a Google account (reusing the existing Google OAuth)
 * and picks a presentation from their Drive; the backend exports each slide as an
 * image and the embed plays them as a looping slideshow, re-exporting on its own
 * so edits reach the screen.
 *
 * For decks already "published to the web" use the keyless `gslides-public` app
 * instead — it needs no account. This one needs Google OAuth configured on the
 * backend (`GOOGLE_CLIENT_ID`/`SECRET` + `ENCRYPTION_KEY`), like Google Calendar.
 * It streams the exported images from Google, so it `requiresNetwork`.
 */
export const gslidesManifest: AppManifest = {
  slug: 'gslides',
  name: 'Google Slides (private)',
  tagline: 'Loop a private Google Slides deck from your account',
  description:
    'Connect your Google account and play a private Google Slides deck as a slideshow — it re-exports automatically so edits show up.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  refreshSeconds: 900,
  requiresNetwork: true,
  icon: GSLIDES_ICON,
  color: '#FBBC04',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Google account',
      required: true,
      provider: 'google',
      help: 'Sign in once — Edge then lists your presentations to choose from.',
    },
    {
      key: 'presentation',
      type: 'remote-select',
      label: 'Presentation',
      required: true,
      remoteSource: 'google-presentations',
      placeholder: 'Search your presentations…',
      help: 'Pick a Google Slides deck from your Drive. Edit it later and the screen catches up.',
    },
    {
      key: 'slideSeconds',
      type: 'number',
      label: 'Seconds per slide',
      default: 8,
      validation: { min: 1, max: 120 },
    },
    {
      key: 'maxSlides',
      type: 'number',
      label: 'Slides to show',
      help: 'Leave at 0 to show every slide. Set a number to stop after that many.',
      default: 0,
      validation: { min: 0, max: 30 },
    },
  ],
}
