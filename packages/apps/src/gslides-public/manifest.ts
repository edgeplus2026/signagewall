import type { AppManifest } from '@edge/apps-contract'

const SLIDES_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 18v3"/></svg>'

/** Any Google Slides presentation link; the embed helper re-checks and rewrites it. */
const SLIDES_URL_PATTERN = '^https?://docs\\.google\\.com/presentation/.+'

/**
 * Google Slides — display a Google Slides deck that has been "Published to the
 * web" (or shared as "anyone with the link"). Pure client-side (`static`): the
 * player embeds the deck's `/embed` view straight from Google and it advances on
 * its own. No account/OAuth — that's the `connected` Slides app in BACKLOG.md.
 *
 * Streams from Google, so it `requiresNetwork` and is hidden while offline.
 */
export const gslidesPublicManifest: AppManifest = {
  slug: 'gslides-public',
  name: 'Google Slides',
  tagline: 'Loop a published Google Slides deck',
  description:
    'Show a Google Slides presentation that you\'ve published to the web — it advances on its own and picks up your edits.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  requiresNetwork: true,
  icon: SLIDES_ICON,
  color: '#FBBC04',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Presentation link',
      // Publishing is the step people miss — a normal edit link needs a login and
      // shows nothing on a screen. Name the exact menu path.
      help: 'In Google Slides: File → Share → Publish to web, then paste the link here. A plain edit link won\'t show on a screen.',
      required: true,
      placeholder: 'https://docs.google.com/presentation/d/e/…/pub',
      validation: { pattern: SLIDES_URL_PATTERN },
    },
    {
      key: 'slideSeconds',
      type: 'number',
      label: 'Seconds per slide',
      help: 'How long each slide stays up before it advances.',
      default: 5,
      validation: { min: 1, max: 600 },
    },
    {
      key: 'loop',
      type: 'switch',
      label: 'Loop',
      help: 'Start over from the first slide after the last one.',
      default: true,
    },
  ],
}
