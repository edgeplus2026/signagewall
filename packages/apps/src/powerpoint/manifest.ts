import type { AppManifest } from '@signagewall/apps-contract'

import {
  POWERPOINT_EMBED_URL_PATTERN,
  POWERPOINT_SOURCE_EMBED,
  POWERPOINT_SOURCE_MICROSOFT,
} from './source.js'

const POWERPOINT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 20h10M12 18v2"/><path d="M8 8h4a2 2 0 010 4H8V8v4"/></svg>'

/**
 * PowerPoint has two source modes. A public Microsoft embed URL is static/live
 * and needs no account. The private mode connects Microsoft and picks a `.pptx`
 * from OneDrive/SharePoint; the backend renders the deck to slide images (Graph
 * `pptx → PDF`, then poppler → WebP, stored on R2).
 *
 * Updates are driven by a Microsoft Graph change-subscription on the file: the
 * moment the deck changes in OneDrive the connector re-renders and the screens
 * swap to the new version. Polling (`refreshSeconds`) is the fallback. Slides
 * are re-hosted on R2 (not live CDN embeds), so they cache for offline playback
 * like any other image. `requiresNetwork` is resolved per instance by the
 * player: embed mode needs it, connected/cached mode does not.
 */
export const powerpointManifest: AppManifest = {
  slug: 'powerpoint',
  name: 'PowerPoint',
  tagline: 'Show a PowerPoint deck on your screens',
  description:
    'Paste a public PowerPoint embed URL with no account, or connect Microsoft for a private, automatically synced slideshow.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 3,
  // Polling fallback; the Graph webhook makes updates near-instant when a public
  // callback URL is configured.
  refreshSeconds: 900,
  icon: POWERPOINT_ICON,
  color: '#D24726',
  configSchema: [
    {
      key: 'source',
      type: 'select',
      label: 'Presentation source',
      required: true,
      // Deliberately no schema default. The CMS resolves an absent value with
      // `resolvePowerPointSource`, which keeps v2 connected instances connected
      // while new instances open in embed mode.
      options: [
        {
          label: 'Embed URL (no account needed)',
          value: POWERPOINT_SOURCE_EMBED,
        },
        {
          label: 'Microsoft account (private file)',
          value: POWERPOINT_SOURCE_MICROSOFT,
        },
      ],
      help: 'Use Microsoft’s public embed link without connecting an account, or sign in to show a private OneDrive/SharePoint file.',
    },
    {
      key: 'embedUrl',
      type: 'url',
      label: 'PowerPoint embed URL',
      required: true,
      visibleWhen: { field: 'source', equals: POWERPOINT_SOURCE_EMBED },
      placeholder: 'https://onedrive.live.com/embed?…',
      validation: { pattern: POWERPOINT_EMBED_URL_PATTERN },
      help: 'In PowerPoint for the web choose File → Share → Embed this presentation, then paste only the iframe src URL. The presentation must be public to anyone with the link.',
    },
    {
      key: 'embedRefreshMinutes',
      type: 'number',
      label: 'Reload every (minutes)',
      default: 15,
      visibleWhen: { field: 'source', equals: POWERPOINT_SOURCE_EMBED },
      validation: { min: 1, max: 1440 },
      help: 'Reloads the Microsoft viewer so edits to the published deck appear without touching the screen.',
    },
    {
      key: 'connectionId',
      type: 'oauth',
      label: 'Microsoft account',
      visibleWhen: { field: 'source', equals: POWERPOINT_SOURCE_MICROSOFT },
      provider: 'microsoft',
      // The read-only promise is the first thing a non-technical operator wants
      // answered before handing over a Microsoft account. It is true — the OAuth
      // scopes are read-only (Files.Read.All / Sites.Read.All; see
      // powerpoint.connector.ts). Keep the two in step if the scopes ever widen.
      help: 'Sign in once. SignageWall only reads your files — it never changes or deletes anything.',
    },
    {
      key: 'presentation',
      type: 'remote-select',
      label: 'Presentation',
      required: true,
      visibleWhen: { field: 'source', equals: POWERPOINT_SOURCE_MICROSOFT },
      remoteSource: 'powerpoint-files',
      placeholder: 'Search your PowerPoint files…',
      help: 'Pick the .pptx to show. Works with both personal OneDrive and work / SharePoint files.',
    },
    {
      key: 'slideDuration',
      type: 'number',
      label: 'Seconds per slide',
      default: 15,
      visibleWhen: { field: 'source', equals: POWERPOINT_SOURCE_MICROSOFT },
      validation: { min: 3, max: 120 },
      help: 'How long each slide stays on screen before the next one.',
    },
    // No transition field: slides always crossfade (a hard cut reads as a
    // glitch on signage), and no auto-update switch: the deck on screen always
    // follows the file in OneDrive — that immediacy is the app's whole promise.
    {
      key: 'fit',
      type: 'select',
      label: 'Fit to screen',
      default: 'contain',
      visibleWhen: { field: 'source', equals: POWERPOINT_SOURCE_MICROSOFT },
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
      visibleWhen: { field: 'source', equals: POWERPOINT_SOURCE_MICROSOFT },
      help: 'Colour of the bars around a slide that doesn’t match the screen’s shape.',
    },
    // No theme / accent / language field, and the absence is deliberate: a slide
    // IS the design the operator already authored. Tinting it here would only let
    // them undo their own work (same reasoning as the gcal manifest).
  ],
}
