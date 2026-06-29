import type { AppManifest } from '@edge/apps-contract'

const SLIDES_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 20h18"/></svg>'

/**
 * Slides / Presentation — a `static` embed. The operator publishes a Google
 * Slides deck (or any presentation) "to the web" and pastes the published embed
 * URL; the player shows it full-screen in an iframe. No OAuth/connector needed,
 * because a published deck is already a public URL — the simplest reliable path
 * (confirmed product decision over Drive export).
 */
export const slidesManifest: AppManifest = {
  slug: 'slides',
  name: 'Slides',
  tagline: 'Show a published Google Slides deck',
  description:
    'Publish a Google Slides presentation to the web and display it full-screen — auto-advancing if you set it to.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: SLIDES_ICON,
  color: '#FBBC04',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Published embed URL',
      required: true,
      help: 'In Google Slides: File → Share → Publish to web → Embed',
      placeholder: 'https://docs.google.com/presentation/d/e/…/embed',
    },
  ],
}
