import type { AppManifest } from '@signagewall/apps-contract'

const TEXT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>'

/**
 * Text / Announcement — quick on-screen messages. Pure client-side: renders the
 * configured rich text centered on a solid background. "Theme" is the quick
 * light/dark preset (like every other app); the two colour pickers fine-tune it.
 */
export const textManifest: AppManifest = {
  slug: 'text',
  name: 'Text',
  tagline: 'Show a message or announcement',
  description: 'Display a short message or announcement on your screens.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 4,
  icon: TEXT_ICON,
  color: '#6366F1',
  configSchema: [
    {
      key: 'body',
      type: 'richtext',
      label: 'Message',
      help: 'The text to show, centered on the screen. Use the toolbar to style it.',
      required: true,
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      // Matches the "Theme" convention across apps; picking one presets the two
      // colours below, which the operator can then fine-tune.
      help: 'A quick light or dark look. You can still fine-tune the colours below.',
      default: 'dark',
      options: [
        { label: 'Dark', value: 'dark', set: { color: '#FFFFFF', backgroundColor: '#0B1220' } },
        { label: 'Light', value: 'light', set: { color: '#0F172A', backgroundColor: '#FFFFFF' } },
      ],
    },
    {
      key: 'color',
      type: 'color',
      label: 'Text color',
      help: 'The colour of the message text.',
      default: '#FFFFFF',
    },
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Background color',
      help: 'The colour behind the message.',
      default: '#0B1220',
    },
  ],
}
