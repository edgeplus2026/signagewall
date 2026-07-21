import type { AppManifest } from '@edge/apps-contract'

const POWERBI_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><rect x="5" y="10" width="3.5" height="8" rx="1"/><rect x="10.25" y="4" width="3.5" height="14" rx="1"/><rect x="15.5" y="13" width="3.5" height="5" rx="1"/></svg>'

/** An https Power BI host (app.powerbi.com, national clouds, …) with a path. */
const POWERBI_URL_PATTERN = '^https://([a-z0-9-]+\\.)*powerbi\\.com/.+'

/**
 * Power BI — a `static` app that embeds a Power BI report published for public
 * viewing. The operator uses Power BI's "Publish to web" and pastes the
 * resulting `app.powerbi.com/view?r=…`
 * link; the embed renders it in a sandboxed iframe and can reload it on a
 * cadence. No account, no OAuth, no capacity.
 *
 * This is deliberately the public-report app. Embedding a PRIVATE report needs
 * either a Power BI capacity + server-side export or an embed token (see
 * BACKLOG.md) — neither is this app. A normal report URL (which requires a
 * login) will not load on an unattended screen; the field help says so, because
 * pasting one is the single most common mistake.
 */
export const powerbiManifest: AppManifest = {
  slug: 'powerbi',
  name: 'Power BI',
  tagline: 'Put a published Power BI report on the wall',
  description:
    'Embed a Power BI report you have published to the web, and reload it on a schedule so the numbers stay current.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 2,
  // Renders a live remote page — nothing cached to show while offline.
  requiresNetwork: true,
  icon: POWERBI_ICON,
  color: '#F2C811',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Power BI embed link',
      required: true,
      placeholder: 'https://app.powerbi.com/view?r=…',
      // The #1 failure is pasting the ordinary report URL (needs a login) instead
      // of a "Publish to web" link — name the exact fix.
      help: 'In Power BI open the report → File → Embed report → Publish to web (public), then paste the link here. A normal report link needs a login and will not load on a screen.',
      validation: { pattern: POWERBI_URL_PATTERN },
    },
    {
      key: 'refreshMinutes',
      type: 'number',
      label: 'Reload every (minutes)',
      // Always-on: a signage report should stay current on its own, so the reload
      // is never "off" — the operator only tunes how often.
      help: 'How often to reload the whole report so it always shows the latest data. Lower is fresher; 15 minutes suits most dashboards.',
      default: 15,
      validation: { min: 1, max: 1440 },
    },
  ],
}
