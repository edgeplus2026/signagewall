import type { AppManifest } from '@edge/apps-contract'

const QR_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z"/></svg>'

/**
 * QR code — turns any URL/text into a scannable code (menus, promos,
 * contactless). Pure client-side: the code is generated in the browser.
 */
export const qrManifest: AppManifest = {
  slug: 'qr',
  name: 'QR code',
  tagline: 'Show a scannable QR code',
  description:
    'Turn a link or text into a QR code your audience can scan from the screen.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: QR_ICON,
  color: '#111827',
  configSchema: [
    {
      key: 'value',
      type: 'text',
      label: 'Link or text',
      required: true,
      placeholder: 'https://example.com',
    },
    {
      key: 'caption',
      type: 'text',
      label: 'Caption',
      placeholder: 'Scan me',
    },
  ],
}
