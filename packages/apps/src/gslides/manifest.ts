import type { AppManifest } from '@signagewall/apps-contract'

const GSLIDES_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><rect x="7" y="8" width="10" height="6" rx="1"/><path d="M8 21h8M12 18v3"/></svg>'

/**
 * Google Slides — a `connected` app for private decks. The operator connects a
 * Google account (reusing the existing Google OAuth) and picks a presentation
 * from their Drive; the backend exports each slide as an image, mirrors it to R2
 * and the embed plays them as a looping slideshow.
 *
 * Updates are driven by a Google Drive `files.watch` push channel on the deck:
 * the moment it changes in Drive the connector re-exports and the screens swap to
 * the new version. Polling (`refreshSeconds`) is the fallback. Slides are
 * re-hosted on R2 (not Google's expiring thumbnail URLs), so they cache for
 * offline playback like any other image — hence no `requiresNetwork`.
 *
 * Needs Google OAuth configured on the backend (`GOOGLE_CLIENT_ID`/`SECRET` +
 * `ENCRYPTION_KEY`), like Google Calendar, plus R2 for the mirrored slides.
 */
export const gslidesManifest: AppManifest = {
  slug: 'gslides',
  name: 'Google Slides',
  tagline: 'Loop a private Google Slides deck from your account',
  description:
    'Connect your Google account and play a private Google Slides deck as a slideshow. It updates on screen the moment the deck changes.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 3,
  // Polling fallback; the Drive webhook makes updates near-instant when a public
  // callback URL is configured.
  /**
   * One minute, and it is the FAST path rather than the fallback it looks like.
   *
   * The connector subscribes to Drive `files.watch`, but Google throttles change
   * notifications for a file to roughly one per three minutes (measured in
   * production on the Sheets connector: consecutive pings 180.7 s and 186.6 s
   * apart). Push has a floor we cannot lower, and at the old 900 s cadence the
   * poll was slower still — so an edited deck took many minutes to reach a wall.
   *
   * Affordable because the fetch SHORT-CIRCUITS: it reads the Drive revision
   * first and reuses the mirrored slides unchanged, so a minute cadence costs one
   * cheap metadata call per deck. The expensive path — a thumbnail export per
   * slide, then mirroring — still only runs when the deck actually changed.
   */
  refreshSeconds: 60,
  icon: GSLIDES_ICON,
  color: '#FBBC04',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Google account',
      required: true,
      provider: 'google',
      help: 'Sign in once. SignageWall then lists your presentations to choose from.',
    },
    {
      key: 'presentation',
      type: 'remote-select',
      label: 'Presentation',
      required: true,
      remoteSource: 'google-presentations',
      // As with Google Sheets: picked in Google's picker, so `drive.file` is
      // enough and the restricted metadata scope is not requested at all.
      picker: 'google-drive',
      placeholder: 'Search your presentations…',
      help: 'Pick a Google Slides deck from your Drive. Edit it later and the screen updates on its own.',
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
      help: 'Leave at 0 to show every slide. Set a number to stop after that many. Decks longer than 100 slides are cut at 100.',
      default: 0,
      // Matches the connector's MAX_SLIDES cap (and PowerPoint's), so the field
      // can never promise more slides than the backend will ever mirror.
      validation: { min: 0, max: 100 },
    },
  ],
}
