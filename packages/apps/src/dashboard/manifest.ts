import type { AppManifest } from '@edge/apps-contract'

const DASHBOARD_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>'

/** Accepts any http(s) URL; the embed re-checks and sandboxes it at load. */
const HTTP_URL_PATTERN = '^https?://.+'

/**
 * Dashboard — a `web`-style live embed tuned for dashboards that need to stay
 * fresh: Grafana public/snapshot links, Looker Studio embeds, Power BI
 * "publish to web", a metabase public dashboard. The one thing it adds over the
 * plain Web app is a **reload cadence** — a wall dashboard is only useful if the
 * numbers move, and a page left mounted for a week shows week-old data.
 *
 * Still `static` (no connector): the page is fetched by the player at render
 * time, so this is a *public/anonymous* dashboard URL. Authenticated dashboards
 * (Power BI embed tokens, private Grafana) are the `connected` variants in
 * BACKLOG.md, not this app.
 */
export const dashboardManifest: AppManifest = {
  slug: 'dashboard',
  name: 'Dashboard',
  tagline: 'Put a live dashboard on the wall',
  description:
    'Embed a public dashboard (Grafana, Looker Studio, Power BI publish-to-web, …) and reload it on a schedule so the numbers stay current.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  // Renders a live remote page — nothing cached to show while offline.
  requiresNetwork: true,
  icon: DASHBOARD_ICON,
  color: '#6366F1',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Dashboard link',
      // The single most common failure is pasting a private/edit URL that won't
      // load on a screen with no login — name the fix (a public/embed/share link).
      help: "The dashboard's public, embeddable link — Grafana's share/snapshot URL, Looker Studio's embed URL, or Power BI's “publish to web” link. A private/login page won't load on a screen.",
      required: true,
      placeholder: 'https://example.grafana.net/public-dashboards/…',
      validation: { pattern: HTTP_URL_PATTERN },
    },
    {
      key: 'refreshMinutes',
      type: 'number',
      label: 'Reload every (minutes)',
      help: 'Reload the dashboard this often to pull fresh data. Set 0 to never reload.',
      default: 5,
      validation: { min: 0, max: 1440 },
    },
  ],
}
