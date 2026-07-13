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
  version: 2,
  icon: TEXT_ICON,
  color: '#6366F1',
  configSchema: [
    {
      key: 'body',
      type: 'richtext',
      label: 'Message',
      required: true,
      help: 'What the screen says. Keep it short — people read it from across the room.',
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
