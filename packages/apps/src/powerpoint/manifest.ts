import type { AppManifest } from '@edge/apps-contract'

const POWERPOINT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 20h10M12 18v2"/><path d="M8 8h4a2 2 0 010 4H8V8v4"/></svg>'

/**
 * PowerPoint — a `connected` app (Microsoft). The operator connects a Microsoft
 * account and picks a `.pptx` from OneDrive/SharePoint (searchable picker); the
 * backend connector renders the deck to slide images (Graph `pptx → PDF`, then
 * poppler → WebP, stored on R2) and the embed shows them as a static slideshow.
 *
 * Updates are driven by a Microsoft Graph change-subscription on the file: the
 * moment the deck changes in OneDrive the connector re-renders and the screens
 * swap to the new version. Polling (`refreshSeconds`) is the fallback. Slides
 * are re-hosted on R2 (not live CDN embeds), so they cache for offline playback
 * like any other image — hence no `requiresNetwork`.
 */
export const powerpointManifest: AppManifest = {
  slug: 'powerpoint',
  name: 'PowerPoint',
  tagline: 'Show a PowerPoint deck on your screens',
  description:
    'Display a PowerPoint presentation from OneDrive or SharePoint as a looping slideshow — it updates on screen the moment the deck changes.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 1,
  // Polling fallback; the Graph webhook makes updates near-instant when a public
  // callback URL is configured.
  refreshSeconds: 900,
  icon: POWERPOINT_ICON,
  color: '#D24726',
  configSchema: [
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Microsoft account',
      required: true,
      provider: 'microsoft',
      // The read-only promise is the first thing a non-technical operator wants
      // answered before handing over a Microsoft account. It is true — the OAuth
      // scopes are read-only (Files.Read.All / Sites.Read.All; see
      // powerpoint.connector.ts). Keep the two in step if the scopes ever widen.
      help: 'Sign in once. Edge only reads your files — it never changes or deletes anything.',
    },
    {
      key: 'presentation',
      type: 'remote-select',
      label: 'Presentation',
      required: true,
      remoteSource: 'powerpoint-files',
      placeholder: 'Search your PowerPoint files…',
      help: 'Pick the .pptx to show. Works with both personal OneDrive and work / SharePoint files.',
    },
    {
      key: 'slideDuration',
      type: 'number',
      label: 'Seconds per slide',
      default: 10,
      validation: { min: 3, max: 120 },
      help: 'How long each slide stays on screen before the next one.',
    },
    {
      key: 'transition',
      type: 'select',
      label: 'Transition',
      default: 'fade',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Fade', value: 'fade' },
      ],
      help: 'How one slide gives way to the next.',
    },
    {
      key: 'fit',
      type: 'select',
      label: 'Fit to screen',
      default: 'contain',
      options: [
        { label: 'Fit whole slide (letterbox)', value: 'contain' },
        { label: 'Fill screen (crop edges)', value: 'cover' },
      ],
      help: 'Show the whole slide with bars, or fill the screen and crop the edges. Portrait screens usually want letterbox.',
    },
    {
      key: 'background',
      type: 'color',
      label: 'Letterbox colour',
      default: '#000000',
      visibleWhen: { field: 'fit', equals: 'contain' },
      help: 'Colour of the bars around a slide that doesn’t match the screen’s shape.',
    },
    {
      key: 'autoUpdate',
      type: 'switch',
      label: 'Auto-update on changes',
      default: true,
      help: 'When you edit the presentation in OneDrive, the screen refreshes to the new version automatically. Turn off to keep showing the current version.',
    },
    // No theme / accent / language field, and the absence is deliberate: a slide
    // IS the design the operator already authored. Tinting it here would only let
    // them undo their own work (same reasoning as the gcal manifest).
  ],
}
