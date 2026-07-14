import type { AppConnector } from '@edge/apps-contract';

import { canvaConnector } from './canva.connector';
import { gcalConnector } from './gcal.connector';
import { rssConnector } from './rss.connector';
import { weatherConnector } from './weather.connector';

/**
 * Backend connector implementations, keyed by app slug. A `server` app has a
 * connector here; `static` apps do not. The scheduler and the player content
 * resolver look up connectors by slug to compute `cacheKey`s and (for the
 * scheduler) to `fetchData`. Connectors live in the backend — network I/O and
 * any secrets never reach the shared `@edge/apps` package or the player.
 */
const CONNECTORS: Record<string, AppConnector> = {
  weather: weatherConnector,
  gcal: gcalConnector,
  canva: canvaConnector,
  rss: rssConnector,
};

/** The connector for `slug`, or undefined for `static` apps / unknown slugs. */
export function getConnector(slug: string): AppConnector | undefined {
  return CONNECTORS[slug];
}

/** Every slug that has a backend connector. */
export function connectorSlugs(): string[] {
  return Object.keys(CONNECTORS);
}
