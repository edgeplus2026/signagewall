import type { AppDataMeta } from './host-bridge.js'

/**
 * An offline notice for `server`-app bundles (weather / fx / rss / …).
 *
 * It renders ONLY when the latest upstream fetch failed and the screen is showing
 * last-known-good data. In the healthy case — which is virtually all of the time —
 * it renders nothing at all: a wall in production carries no chrome, no timestamp,
 * no badge. This used to print "as of HH:MM" on every screen permanently, and that
 * came out; the warning did not, because it is the only thing on the wall
 * distinguishing this morning's exchange rates from last Tuesday's.
 *
 * Deliberately no time in it either. "Offline · as of 14:20" invites a passer-by to
 * work out how stale the data is from a clock they may not be able to see; the fact
 * that it is NOT live is the whole message, and it fits in one word.
 *
 * Returns '' for static apps, for server apps whose fetches are healthy, and for
 * one that has never fetched at all. The output is a literal, so it carries no
 * injection risk.
 */
export function freshnessFooterHtml(meta: AppDataMeta | null): string {
  if (meta?.stale !== true) {
    return ''
  }
  return '<div class="data-meta">Offline</div>'
}
