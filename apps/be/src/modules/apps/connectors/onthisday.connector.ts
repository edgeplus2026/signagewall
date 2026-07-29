import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import type { OnThisDayEvent, OnThisDayPayload } from '@signagewall/apps';

interface OnThisDayConfig {
  language?: string;
  // `count` is display-only (how many the bundle shows); not in the cacheKey.
  count?: number;
}

/** Wikipedia editions that carry the On This Day REST feed. */
const SUPPORTED = new Set(['en', 'de', 'es', 'fr']);

/** Store a generous window; the bundle shows the operator's `count` from it. */
const MAX_STORED = 20;

function languageOf(config: OnThisDayConfig): string {
  const lang = (config.language ?? 'en').trim().toLowerCase();
  return SUPPORTED.has(lang) ? lang : 'en';
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

interface WikiEvent {
  year?: number;
  text?: string;
}

/**
 * On This Day connector (`server`). Cache key is the language only; "today" is
 * resolved here on the server (`new Date()`), so the same day's events are shared
 * across every screen in that language. Events come back most-recent-first. A
 * `User-Agent` is sent per Wikimedia's API policy. No fetch timestamp — only the
 * date (which changes once a day) rides in the payload.
 */
export const onthisdayConnector: AppConnector<
  OnThisDayConfig,
  OnThisDayPayload
> = {
  cacheKey(config) {
    return `onthisday:${languageOf(config)}`;
  },

  async fetchData(
    config: OnThisDayConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<OnThisDayPayload>> {
    const language = languageOf(config);
    const now = new Date();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());

    const url = `https://${language}.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
    const response = await fetch(url, {
      headers: {
        // Wikimedia requires a descriptive User-Agent or it may reject the request.
        'User-Agent':
          'signagewall/1.0 (https://signagewall.com; digital signage)',
        accept: 'application/json',
      },
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`onthisday upstream ${response.status}`);
    }
    const body = (await response.json()) as { events?: WikiEvent[] };

    const events: OnThisDayEvent[] = (body.events ?? [])
      .filter(
        (event): event is Required<WikiEvent> =>
          typeof event.year === 'number' && typeof event.text === 'string',
      )
      // Most recent first — the familiar "…, 1969, …, 1492" reading order.
      .sort((a, b) => b.year - a.year)
      .slice(0, MAX_STORED)
      .map((event) => ({ year: event.year, text: event.text }));

    if (events.length === 0) {
      throw new Error('onthisday: no events returned');
    }

    ctx.logger.debug('onthisday fetched', {
      language,
      monthDay: `${month}-${day}`,
      count: events.length,
    });
    return {
      playerPayload: { monthDay: `${month}-${day}`, events },
    };
  },
};
