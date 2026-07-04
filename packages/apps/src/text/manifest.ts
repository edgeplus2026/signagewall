import type { AppManifest } from '@edge/apps-contract'

const TEXT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>'

/**
 * Text / Announcement — quick on-screen messages. Pure client-side: renders the
 * configured text centered on the surface.
 */
export const textManifest: AppManifest = {
  slug: 'text',
  name: 'Text',
  tagline: 'Show a message or announcement',
  description: 'Display a short message or announcement on your screens.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 3,
  icon: TEXT_ICON,
  color: '#6366F1',
  configSchema: [
    {
      key: 'body',
      type: 'richtext',
      label: 'Message',
      // Optional: a slide can be image-only (a full-screen background photo).
      help: 'Optional when a background image is set.',
    },
    {
      key: 'backgroundImage',
      type: 'url',
      label: 'Background image URL',
      help: 'Optional. A full-screen background photo behind the text.',
    },
    {
      key: 'overlay',
      type: 'select',
      label: 'Image overlay',
      default: 'dark',
      help: 'Darkens the background image so text stays readable.',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    {
      key: 'color',
      type: 'color',
      label: 'Text color',
      default: '#FFFFFF',
    },
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Background color',
      default: '#000000',
    },
  ],
}
