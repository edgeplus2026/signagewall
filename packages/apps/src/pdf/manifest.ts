import type { AppManifest } from '@edge/apps-contract'

const PDF_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3Zm0 3v2"/><path d="M14 13v5"/><path d="M14 13h2"/><path d="M14 15.5h1.5"/></svg>'

/**
 * PDF Reader — upload a PDF from your computer and show it on the wall.
 *
 * Fully client-side (`static`): the file rides inside the instance config as a
 * base64 `data:` URL (see the `file` field), so it needs no backend connector
 * and keeps working while the screen is offline. The embed renders each page to
 * a canvas with pdf.js; a multi-page PDF auto-advances at the chosen `speed`.
 */
export const pdfManifest: AppManifest = {
  slug: 'pdf',
  name: 'PDF Reader',
  tagline: 'Show a PDF on screen',
  description:
    'Upload a PDF and display it full-screen. A multi-page PDF flips through its pages automatically at a speed you choose.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  icon: PDF_ICON,
  color: '#EF4444',
  configSchema: [
    {
      key: 'file',
      type: 'file',
      label: 'PDF',
      help: 'Upload a PDF from your computer (up to 10MB).',
      required: true,
      placeholder: 'Upload a PDF',
      accept: 'application/pdf',
      maxSizeMb: 10,
    },
    {
      key: 'speed',
      type: 'select',
      label: 'Speed',
      help: 'How long each page stays on screen. Only matters for multi-page PDFs.',
      default: 'medium',
      options: [
        { label: 'Slow (10s)', value: 'slow' },
        { label: 'Medium (7s)', value: 'medium' },
        { label: 'Fast (5s)', value: 'fast' },
      ],
    },
  ],
}
