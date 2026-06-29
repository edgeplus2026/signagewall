import { createHash } from 'node:crypto';

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { RssItem, RssPayload } from '@edge/apps';

import { safeFetchText } from './safe-fetch.util';

interface RssConfig {
  url?: string;
  // `maxItems` is display-only (applied by the bundle); not in the cache key.
  maxItems?: number;
}

/** Cap stored items so a huge feed can't bloat the cache; bundles show fewer. */
const MAX_STORED_ITEMS = 30;

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function firstTag(block: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(
    block,
  );
  return match ? decodeEntities(match[1] ?? '') : undefined;
}

/** Parse RSS 2.0 `<item>` and Atom `<entry>` blocks for title + date. */
function parseFeed(xml: string): { title: string; items: RssItem[] } {
  const feedTitle =
    firstTag(
      xml.split(/<item[\s>]/i)[0]?.split(/<entry[\s>]/i)[0] ?? '',
      'title',
    ) ?? '';

  const blocks = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ].map((match) => match[0]);

  const items: RssItem[] = [];
  for (const block of blocks) {
    const title = firstTag(block, 'title');
    if (!title) continue;
    const published =
      firstTag(block, 'pubDate') ??
      firstTag(block, 'published') ??
      firstTag(block, 'updated');
    const item: RssItem = { title };
    if (published) {
      const parsed = new Date(published);
      if (!Number.isNaN(parsed.getTime())) {
        item.publishedAt = parsed.toISOString();
      }
    }
    items.push(item);
    if (items.length >= MAX_STORED_ITEMS) break;
  }

  return { title: feedTitle, items };
}

/**
 * RSS / Atom connector. The cache key is a hash of the feed URL, so every screen
 * showing the same feed shares one fetch. Returns the normalized item list; the
 * embed bundle applies the instance's `maxItems`.
 */
export const rssConnector: AppConnector<RssConfig, RssPayload> = {
  cacheKey(config) {
    const url = (config.url ?? '').trim();
    return `rss:${createHash('sha1').update(url).digest('hex')}`;
  },

  async fetchData(
    config: RssConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<RssPayload>> {
    const url = (config.url ?? '').trim();
    if (!url) {
      throw new Error('rss: missing feed url');
    }

    const xml = await safeFetchText(
      url,
      ctx.signal ? { signal: ctx.signal } : {},
    );
    const { title, items } = parseFeed(xml);

    if (items.length === 0) {
      throw new Error('rss: no items parsed');
    }

    ctx.logger.debug('rss fetched', { url, items: items.length });
    return {
      playerPayload: { title, items, fetchedAt: new Date().toISOString() },
    };
  },
};
