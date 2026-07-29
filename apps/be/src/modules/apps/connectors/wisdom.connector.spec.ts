import type { ConnectorContext } from '@signagewall/apps-contract';
import {
  UPSTREAM_QUOTES,
  WISDOM_CATEGORIES,
  type WisdomPayload,
} from '@signagewall/apps';

import { poolFor, wisdomConnector } from './wisdom.connector';

const ctx: ConnectorContext = {
  organizationId: '',
  logger: {
    debug: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  },
};

async function fetchPayload(
  config: Record<string, unknown>,
): Promise<WisdomPayload> {
  const result = await wisdomConnector.fetchData(config, ctx);
  return result.playerPayload as WisdomPayload;
}

describe('wisdom cacheKey', () => {
  it('is the categories, and only the categories', () => {
    const a = wisdomConnector.cacheKey!({
      categories: ['motivation', 'sports'],
      quoteCount: 5,
      secondsPerQuote: 20,
    });
    const b = wisdomConnector.cacheKey!({
      categories: ['motivation', 'sports'],
      quoteCount: 20,
      secondsPerQuote: 90,
    });

    expect(a).toBe('wisdom:v2:motivation+sports');
    // Display-only settings must not split the cache: two gyms on the same topics
    // but different rotation speeds share one selection.
    expect(a).toBe(b);
  });

  it('sorts, so the same topics in any order are one cache entry', () => {
    const a = wisdomConnector.cacheKey!({
      categories: ['wisdom', 'motivation'],
    });
    const b = wisdomConnector.cacheKey!({
      categories: ['motivation', 'wisdom'],
    });

    expect(a).toBe(b);
  });

  it('drops unknown categories and falls back when nothing survives', () => {
    // A config can outlive the category it names.
    const key = wisdomConnector.cacheKey!({ categories: ['nonsense', 'gone'] });

    expect(key).toBe('wisdom:v2:motivation+wisdom');
  });
});

describe('wisdom corpus', () => {
  /**
   * The guard that matters most. The category list is shipped to the CMS from the
   * shared package, and the quotes live in a vendored corpus in this app — two
   * files that can drift apart without anything failing to compile. A category an
   * operator can pick with nothing behind it is a blank screen, so every single one
   * has to resolve to a real pool.
   */
  it('every category the CMS offers has quotes behind it', async () => {
    for (const category of WISDOM_CATEGORIES) {
      const payload = await fetchPayload({ categories: [category.value] });

      // Every category must be deep enough to fill a whole batch on its own — a
      // screen pinned to the thinnest one still gets a full rotation, not a stub.
      expect(payload.quotes).toHaveLength(UPSTREAM_QUOTES);
      expect(payload.quotes[0]?.text).toBeTruthy();
    }
  });

  it('a multi-category pick unions the pools rather than intersecting them', () => {
    const rows = [
      { text: 'a', author: 'x', categories: ['sports'] },
      { text: 'b', author: 'x', categories: ['health_wellness'] },
      { text: 'c', author: 'x', categories: ['humor'] },
    ];

    // A gym picking Motivation AND Sports wants both, not only quotes tagged both.
    expect(poolFor(rows, ['sports', 'health_wellness'])).toHaveLength(2);
  });

  it('respects the signage length cap', () => {
    const rows = [
      { text: 'short enough', author: 'x', categories: ['wisdom'] },
      { text: 'x'.repeat(400), author: 'y', categories: ['wisdom'] },
    ];

    expect(poolFor(rows, ['wisdom'])).toHaveLength(1);
  });
});

describe('wisdom selection', () => {
  /**
   * The reason the selection is seeded on the date rather than rolled fresh.
   *
   * The scheduler can call a connector more than once a day — a retry after an
   * error, a backend restart, a new instance appearing on the same categories. If
   * each call produced a different batch, the host's deep-compare would see changed
   * data and fan a new snapshot out to every screen in the fleet, and the quotes
   * would visibly reshuffle under people mid-morning for no reason.
   */
  it('returns the identical batch on repeat calls within a day', async () => {
    const config = { categories: ['wisdom'] };

    const first = await fetchPayload(config);
    const second = await fetchPayload(config);

    expect(second.quotes).toEqual(first.quotes);
  });

  it('gives different topics different quotes', async () => {
    const humor = await fetchPayload({ categories: ['humor'] });
    const business = await fetchPayload({ categories: ['business'] });

    expect(humor.quotes[0]?.text).not.toBe(business.quotes[0]?.text);
  });

  it('never returns a quote with an empty author key', async () => {
    const payload = await fetchPayload({ categories: ['famous'] });

    for (const quote of payload.quotes) {
      if ('author' in quote) {
        expect(quote.author).not.toBe('');
      }
    }
  });
});
