import type { AppDataMeta } from './host-bridge.js'

/** Format an ISO timestamp as a short local `HH:MM`, or '' if unparseable. */
function shortTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * An unobtrusive freshness footer for `server`-app bundles (weather / fx / rss).
 * Shows when the data was last successfully fetched, and — when the latest fetch
 * failed — flags that the screen is showing last-known-good data, so hours-old
 * weather/rates can never masquerade as live.
 *
 * Returns '' when there is nothing meaningful to show (static apps, or a server
 * app before its first successful fetch). The output is built from controlled
 * values only (an ISO time and literals), so it carries no injection risk.
 */
export function freshnessFooterHtml(meta: AppDataMeta | null): string {
  if (!meta?.fetchedAt) {
    return ''
  }
  const time = shortTime(meta.fetchedAt)
  if (!time) {
    return ''
  }
  if (meta.stale === true) {
    return `<div class="data-meta is-stale">Offline · as of ${time}</div>`
  }
  return `<div class="data-meta">as of ${time}</div>`
}
