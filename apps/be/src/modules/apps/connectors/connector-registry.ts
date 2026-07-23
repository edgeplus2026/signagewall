import { NEWS_PRESETS } from '@edge/apps';
import type { AppConnector } from '@edge/apps-contract';

import { airqualityConnector } from './airquality.connector';
import { canvaConnector } from './canva.connector';
import { cryptoConnector } from './crypto.connector';
import { currencyConnector } from './currency.connector';
import { facebookConnector } from './facebook.connector';
import { gcalConnector } from './gcal.connector';
import { gsheetsConnector } from './gsheets.connector';
import { gslidesConnector } from './gslides.connector';
import { holidaysConnector } from './holidays.connector';
import { instagramConnector } from './instagram.connector';
import { menuConnector } from './menu.connector';
import { onthisdayConnector } from './onthisday.connector';
import { outlookConnector } from './outlook.connector';
import { powerPricesConnector } from './power-prices.connector';
import { powerpointConnector } from './powerpoint.connector';
import { rssConnector } from './rss.connector';
import { teamsConnector } from './teams.connector';
import { tickerConnector } from './ticker.connector';
import { weatherConnector } from './weather.connector';
import { wisdomConnector } from './wisdom.connector';

/**
 * Backend connector implementations, keyed by app slug. A `server` app has a
 * connector here; `static` apps do not. The scheduler and the player content
 * resolver look up connectors by slug to compute `cacheKey`s and (for the
 * scheduler) to `fetchData`. Connectors live in the backend — network I/O and
 * any secrets never reach the shared `@edge/apps` package or the player.
 */
const CONNECTORS: Record<string, AppConnector> = {
  weather: weatherConnector,
  airquality: airqualityConnector,
  currency: currencyConnector,
  crypto: cryptoConnector,
  'power-prices': powerPricesConnector,
  gcal: gcalConnector,
  gsheets: gsheetsConnector,
  // Menu board: inert (cacheKey '') in manual mode; syncs items from Google
  // Sheets or Excel when the operator picks a tabular source.
  menu: menuConnector,
  gslides: gslidesConnector,
  canva: canvaConnector,
  rss: rssConnector,
  holidays: holidaysConnector,
  onthisday: onthisdayConnector,
  outlook: outlookConnector,
  instagram: instagramConnector,
  facebook: facebookConnector,
  teams: teamsConnector,
  // The ticker overlay: resolves its band messages (rows or RSS headlines).
  ticker: tickerConnector,
  wisdom: wisdomConnector,
  powerpoint: powerpointConnector,
  // Branded news apps (CNN, BBC, …) are the RSS app with a fixed feed URL, so
  // they resolve to the same connector — kept in sync with NEWS_PRESETS.
  ...Object.fromEntries(
    NEWS_PRESETS.map((preset) => [preset.slug, rssConnector]),
  ),
};

/** The connector for `slug`, or undefined for `static` apps / unknown slugs. */
export function getConnector(slug: string): AppConnector | undefined {
  return CONNECTORS[slug];
}

/** Every slug that has a backend connector. */
export function connectorSlugs(): string[] {
  return Object.keys(CONNECTORS);
}
