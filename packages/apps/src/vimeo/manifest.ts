import type { AppManifest } from '@edge/apps-contract'

/** The Vimeo mark, in the brand blue tile. */
const VIMEO_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 7.4c-.13 2.02-1.54 4.79-4.23 8.3-2.78 3.66-5.13 5.5-7.05 5.5-1.19 0-2.19-1.1-3.01-3.29-.55-2.01-1.1-4.02-1.64-6.03-.61-2.19-1.27-3.29-1.97-3.29-.15 0-.68.32-1.59.95L1.5 8.01c1-.88 1.99-1.76 2.96-2.64C5.79 4.2 6.8 3.63 7.48 3.57c1.6-.15 2.59.94 2.96 3.29.4 2.53.68 4.11.83 4.72.46 2.09.96 3.13 1.51 3.13.43 0 1.07-.68 1.93-2.02.86-1.35 1.32-2.37 1.38-3.07.12-1.15-.33-1.73-1.38-1.73-.49 0-1 .11-1.52.34C14.6 5.99 16.6 4.51 19.19 4.6c1.92.06 2.83 1.3 2.81 3.71z"/></svg>'

/** Accepts vimeo.com and player.vimeo.com links (any channel/group/showcase form). */
const VIMEO_URL_PATTERN = '^https?://(www\\.|player\\.)?vimeo\\.com/.+'

/**
 * Vimeo — the Vimeo sibling of the YouTube app. Users paste a Vimeo link; the
 * player loops the video on screen. Pure client-side (no server connector), so
 * its data source is `static` and its only config is the video URL — the same
 * deliberate one-knob shape as YouTube.
 *
 * Runs as an `embed` bundle (`/apps/vimeo/`) and streams straight from Vimeo, so
 * it `requiresNetwork` and is hidden from the rotation while offline.
 */
export const vimeoManifest: AppManifest = {
  slug: 'vimeo',
  name: 'Vimeo',
  tagline: 'Play a Vimeo video on your screens',
  description:
    'Paste a Vimeo link and loop the video across your displays — no downloads, no fuss.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  // Streams the video live from Vimeo — nothing to show offline.
  requiresNetwork: true,
  icon: VIMEO_ICON,
  color: '#1AB7EA',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Vimeo link',
      // Say where to get the link and name the one-video limit up front, so the
      // pattern rejection (a showcase/album link) is never a silent surprise.
      help: "Copy it from Vimeo's address bar, or from its Share button. One video per app.",
      required: true,
      placeholder: 'https://vimeo.com/76979871',
      validation: { pattern: VIMEO_URL_PATTERN },
    },
  ],
}
