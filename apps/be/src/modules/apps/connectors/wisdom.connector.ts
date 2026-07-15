import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import {
  MAX_QUOTE_LENGTH,
  UPSTREAM_QUOTES,
  normalizeCategories,
  type WisdomPayload,
  type WisdomQuote,
} from '@edge/apps';

/**
 * Daily Wisdom connector.
 *
 * IT MAKES NO NETWORK CALLS, AND THAT IS THE DESIGN, not an oversight.
 *
 * The app's premise is categories — a gym wants Motivation, a waiting room wants
 * Health & wellness — and no free quote API can actually serve that. They were all
 * checked: `api.quotable.io` is dead; api-ninjas' free tier forbids commercial use
 * AND forbids caching, which is precisely this architecture; ZenQuotes puts topics
 * behind a paid key; thequoteshub accepts a `tag` parameter and then ignores it.
 * A screen on a customer's wall is not where you want to find out that a free API
 * has changed its mind.
 *
 * So the corpus is ours: ~4,900 categorised quotes vendored at `wisdom/quotes.json`.
 * It cannot rate-limit us, cannot 500, cannot go away, and works the same at 3am on
 * a screen whose upstream provider has quietly folded.
 *
 * PROVENANCE, stated plainly because the next person deserves to know: the corpus
 * is a compilation of two sources — the MIT-licensed `quotable` dataset, and rows
 * drawn from a public Goodreads-derived compilation restricted to the ~700 authors
 * `quotable` had already vetted. It was then cleaned: punctuation repaired, length
 * bounded, and a blocklist applied so a wall never raises religion, violence or
 * politics with a stranger who did not choose to stand in front of it. The
 * Goodreads-derived half carries no explicit licence; these are short quotations
 * from mostly historical figures, re-tagged into our own compilation, which is a
 * low but non-zero risk that was taken knowingly.
 */

interface CorpusRow {
  text: string;
  author: string;
  categories: string[];
}

/**
 * The corpus, read once on first use.
 *
 * Read from disk rather than `import`ed: a 4,900-element JSON literal is something
 * TypeScript would try to infer a type for on every single type-check, and the file
 * is data, not code. It is copied next to the compiled connector by the `assets`
 * rule in `nest-cli.json`, so `__dirname` finds it in both `src` (jest) and `dist`.
 */
let corpus: CorpusRow[] | null = null;

function loadCorpus(): CorpusRow[] {
  if (corpus === null) {
    const file = join(__dirname, 'wisdom', 'quotes.json');
    corpus = JSON.parse(readFileSync(file, 'utf8')) as CorpusRow[];
  }
  return corpus;
}

/** mulberry32 — a tiny seeded PRNG. Same seed, same sequence, every time. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, for turning a category set + a date into a seed. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The server's date as `YYYY-MM-DD` — the day component of the selection seed. */
function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Pick `count` quotes from the pool, deterministically for a given day.
 *
 * Seeding on (categories + date) rather than rolling fresh each time is what keeps
 * the app honest about being *daily*. The scheduler may call this more than once a
 * day — a retry after an error, a backend restart, a new instance appearing on the
 * same categories — and a fresh random draw each time would produce a different
 * payload, which the host would see as changed data and fan out to every screen in
 * the fleet. The quotes would visibly reshuffle under people mid-morning for no
 * reason. With a date seed, every call within the same day returns the identical
 * batch, the deep-compare finds nothing new, and nobody is disturbed. Tomorrow it
 * turns over on its own.
 */
function selectForDay(
  pool: CorpusRow[],
  count: number,
  categories: string[],
  now: Date,
): WisdomQuote[] {
  const random = mulberry32(
    hashString(`${categories.join(',')}|${today(now)}`),
  );
  const shuffled = [...pool];

  // Fisher–Yates, but only as far as we need — the pool can be thousands of rows
  // and we want fifty.
  const take = Math.min(count, shuffled.length);
  for (let index = 0; index < take; index += 1) {
    const swap = index + Math.floor(random() * (shuffled.length - index));
    const held = shuffled[index];
    shuffled[index] = shuffled[swap];
    shuffled[swap] = held;
  }

  return shuffled.slice(0, take).map((row) => {
    const quote: WisdomQuote = { text: row.text };
    // Only when the row actually has one: the shared package is built with
    // `exactOptionalPropertyTypes`, so writing `undefined` is not the same as
    // leaving the key out.
    const author = row.author.trim();
    if (author !== '') {
      quote.author = author;
    }
    return quote;
  });
}

/** Every row carrying at least one of the chosen categories. */
export function poolFor(rows: CorpusRow[], categories: string[]): CorpusRow[] {
  const wanted = new Set(categories);
  return rows.filter(
    (row) =>
      row.text.length <= MAX_QUOTE_LENGTH &&
      row.categories.some((category) => wanted.has(category)),
  );
}

interface WisdomConfig {
  categories?: unknown;
  // `quoteCount` / `secondsPerQuote` are display-only (the bundle applies them);
  // they are deliberately absent from the cache key.
}

export const wisdomConnector: AppConnector<WisdomConfig, WisdomPayload> = {
  /**
   * The chosen categories, normalized and SORTED — and nothing else.
   *
   * Sorting is load-bearing, not tidiness: `['wisdom','motivation']` and
   * `['motivation','wisdom']` are the same request, and an unsorted key would make
   * them two cache entries, two selections, and two fan-outs over one corpus.
   */
  cacheKey(config) {
    return `wisdom:v2:${normalizeCategories(config.categories).join('+')}`;
  },

  fetchData(
    config: WisdomConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<WisdomPayload>> {
    const categories = normalizeCategories(config.categories);
    const pool = poolFor(loadCorpus(), categories);

    // An empty pool is a failure, not an empty screen. Throwing keeps the last good
    // batch on the wall (the host holds last-known-good and flags it stale) and
    // records the error — and if there never was a good batch, the bundle falls back
    // to the quotes it ships with, so the wall is never blank. In practice this can
    // only fire if the corpus and the category list have drifted apart, which is
    // exactly the bug worth shouting about.
    if (pool.length === 0) {
      throw new Error(
        `wisdom: no quotes for categories ${categories.join('+')}`,
      );
    }

    const quotes = selectForDay(pool, UPSTREAM_QUOTES, categories, new Date());

    ctx.logger.debug('wisdom selected', {
      categories: categories.join('+'),
      pool: pool.length,
      quotes: quotes.length,
    });

    return Promise.resolve({ playerPayload: { quotes } });
  },
};
