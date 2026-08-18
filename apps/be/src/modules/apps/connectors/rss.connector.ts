import { createHash } from 'node:crypto';

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import { ConnectorError } from '@signagewall/apps-contract';
import type { RssItem, RssPayload } from '@signagewall/apps';
import { XMLParser } from 'fast-xml-parser';

import { safeFetchText } from './safe-fetch.util';

interface RssConfig {
  url?: string;
  // Everything else on the instance (layout, theme, QR, counts) is display-only:
  // the bundle applies it. Keeping it out of here — and out of the cache key —
  // is what lets a hundred differently-styled screens share one fetch.
}

/** Cap stored items so a huge feed can't bloat the cache; bundles show fewer. */
const MAX_STORED_ITEMS = 30;

/** A summary is a teaser on a wall, not an article. Keep the payload small. */
const MAX_SUMMARY_CHARS = 300;

/**
 * A headline is a headline. Feeds do ship monsters — a malformed CDATA block, an
 * article body pasted into `<title>` — and an unbounded title reaches every
 * layout: the ones that clamp it to three lines merely HIDE the rest, while the
 * one that sets it a letter at a time would build a span per character. Bound it
 * here, at the door, rather than in each of ten renderers.
 */
const MAX_TITLE_CHARS = 220;

/**
 * `removeNSPrefix` collapses `media:content` → `content`, `content:encoded` →
 * `encoded`, `dc:date` → `date`. Feeds are free to bind those namespaces to any
 * prefix they like, so matching on the prefix would quietly miss the ones that
 * don't use the conventional spelling. The one collision it creates — Atom's own
 * `<content>` vs `<media:content>` — is resolved by shape: media carries a `url`
 * attribute, Atom's carries text.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  // Everything stays a string: a title of "2024" is a title, not a number.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  // Feeds are full of `&nbsp;`, `&rsquo;` and friends, not just the five XML ones.
  htmlEntities: true,
});

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An element that may appear once or many times, always as a list. */
function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/** The text of an element — bare, or `#text` when it also carries attributes. */
function text(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (isNode(value) && typeof value['#text'] === 'string') {
    return value['#text'].trim();
  }
  return '';
}

function attr(value: unknown, name: string): string {
  if (!isNode(value)) {
    return '';
  }
  const found = value[`@_${name}`];
  return typeof found === 'string' ? found.trim() : '';
}

/**
 * An http(s) absolute URL, resolved against the feed's own address so a relative
 * `/img/x.jpg` still works. Anything else — `javascript:`, `data:`, junk — is
 * dropped here, at the boundary, so nothing downstream has to wonder.
 */
function absoluteHttpUrl(value: string, base: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = new URL(value, base);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** Strip markup and collapse whitespace: a summary is plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate on a word boundary, with an ellipsis when we actually cut. */
function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * The story's link. RSS puts it in the element's text; Atom puts it in a `href`
 * attribute across possibly several `<link>`s, of which we want the one that
 * points at the story itself (`rel="alternate"`, or no `rel` at all — the
 * default) and never `rel="enclosure"`/`"self"`.
 */
function itemLink(item: Node, base: string): string | undefined {
  for (const link of toArray(item.link)) {
    const asText = text(link);
    if (asText) {
      const url = absoluteHttpUrl(asText, base);
      if (url !== undefined) {
        return url;
      }
    }
    const rel = attr(link, 'rel');
    if (rel === '' || rel === 'alternate') {
      const url = absoluteHttpUrl(attr(link, 'href'), base);
      if (url !== undefined) {
        return url;
      }
    }
  }
  // RSS 1.0 and some Atom feeds identify the story by its `guid`, when that
  // guid happens to be the article's URL (`isPermaLink`).
  return absoluteHttpUrl(text(item.guid), base);
}

/**
 * Atom's `<content>` — the story's text — sharing a key with `<media:content>`
 * once the namespace prefix is gone (see the parser comment).
 *
 * Telling them apart on `typeof === 'string'` is the trap: `<content type="html">`
 * carries an attribute, so the parser hands back an object with a `#text`, not a
 * string. The attribute that actually distinguishes them is `url` — media has
 * one, Atom's content never does.
 */
function atomContent(item: Node): string {
  for (const node of toArray(item.content)) {
    if (isNode(node) && attr(node, 'url')) {
      continue; // a media:content element, not the story's text
    }
    const body = text(node);
    if (body) {
      return body;
    }
  }
  return '';
}

/**
 * Decode entities a second time.
 *
 * These fields carry HTML *inside* XML, so they are encoded twice: The Verge
 * ships `&amp;#038;` in an image URL, the XML parser resolves that to `&#038;`,
 * and what is left is still an entity. Leaving it there had a real cost — a `#`
 * inside a query string starts a URL fragment, so the image silently loaded
 * without half its parameters.
 *
 * Numeric first, named last, so `&amp;#038;` doesn't decode into an `&` that
 * then eats the following text.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) =>
      codePoint(parseInt(hex, 16), match),
    )
    .replace(/&#(\d+);/g, (match, dec: string) =>
      codePoint(parseInt(dec, 10), match),
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * A numeric entity's character, or the entity left as it was when the number
 * isn't a real one.
 *
 * `String.fromCodePoint` THROWS a RangeError on anything above U+10FFFF, and the
 * number here comes straight out of a stranger's feed. Unguarded, a single
 * `&#x110000;` in one headline threw out of the parse, out of `fetchData`, and
 * that feed then failed on every refresh forever.
 */
function codePoint(code: number, original: string): string {
  const valid =
    Number.isInteger(code) &&
    code >= 0 &&
    code <= 0x10ffff &&
    // Lone surrogates are not scalar values; they'd corrupt the string.
    !(code >= 0xd800 && code <= 0xdfff);
  return valid ? String.fromCodePoint(code) : original;
}

/** The four fields a feed might put a story's body in, each fully decoded. */
interface ItemText {
  /** content:encoded — the full article. */
  encoded: string;
  /** Atom `<content>`. */
  content: string;
  /** RSS `<description>`. */
  description: string;
  /** Atom `<summary>`. */
  summary: string;
}

function itemText(item: Node): ItemText {
  return {
    encoded: decodeEntities(text(item.encoded)),
    content: decodeEntities(atomContent(item)),
    description: decodeEntities(text(item.description)),
    summary: decodeEntities(text(item.summary)),
  };
}

/**
 * Every body field, richest first. All of them, because the lead image and the
 * teaser routinely live in *different* ones: The Verge, like much of the Atom
 * world, puts a plain teaser in `<summary>` and the illustrated body in
 * `<content>`. Searching only the field we picked for the summary found no image
 * and quietly shipped a text-only screen for every such feed.
 */
function bodiesOf(body: ItemText): string[] {
  return [body.encoded, body.content, body.description, body.summary].filter(
    (value) => value !== '',
  );
}

/**
 * Text destined for the screen: entities resolved, markup gone, space collapsed.
 *
 * Titles need this as much as bodies do. Feeds routinely wrap a title in CDATA —
 * where the XML parser decodes nothing, because CDATA is literal by definition —
 * so a perfectly ordinary `DJI&#8217;s` reaches us intact and would go up on a
 * wall exactly like that.
 */
function plainText(value: string): string {
  return stripHtml(decodeEntities(value));
}

/**
 * The teaser. Prefers the fields a feed writes *as* a teaser (`description`,
 * `summary`) over the full article body, so we truncate a summary someone wrote
 * rather than the first 300 characters of the piece.
 */
function summaryOf(body: ItemText): string {
  const source =
    body.description || body.summary || body.encoded || body.content;
  return truncate(stripHtml(source), MAX_SUMMARY_CHARS);
}

const EMBEDDED_IMG = /<img[^>]+src\s*=\s*["']([^"']+)["']/i;

/**
 * The `url`s of a group of media elements, biggest first.
 *
 * A feed that offers one picture at several sizes (`media:group`, and most news
 * CMSes do) lists them in no reliable order, so taking the first hands a wall a
 * 240px thumbnail stretched across half a 1080p screen. Sorting on the declared
 * width costs nothing and is the difference between sharp and mushy. Sort is
 * stable, so same-width (or undeclared) entries keep the feed's own order.
 */
function sizedUrls(
  nodes: unknown[],
  accept: (node: Node) => boolean,
): string[] {
  const sized: Array<{ url: string; width: number }> = [];
  for (const node of nodes) {
    if (!isNode(node) || !accept(node)) {
      continue;
    }
    const url = attr(node, 'url') || attr(node, 'href');
    if (url) {
      sized.push({ url, width: Number(attr(node, 'width')) || 0 });
    }
  }
  sized.sort((a, b) => b.width - a.width);
  return sized.map((entry) => entry.url);
}

/**
 * The story's image, in the order feeds actually carry one. Falls back to the
 * first `<img>` in any of the bodies, which is how most blogs ship a lead image.
 */
function itemImage(
  item: Node,
  body: ItemText,
  base: string,
): string | undefined {
  const candidates: string[] = [
    // `<media:content url="…" medium="image">`. Only an element counts — Atom's
    // own <content> is text and lands in the same key (see the parser comment).
    // media:content also carries video and audio, so take it only when it is an
    // image — or when the feed declared neither type nor medium (the lazy case).
    ...sizedUrls(toArray(item.content), (media) => {
      const type = attr(media, 'type');
      const medium = attr(media, 'medium');
      return (
        medium === 'image' || type.startsWith('image/') || (!type && !medium)
      );
    }),
    ...sizedUrls(toArray(item.thumbnail), () => true),
    ...sizedUrls(toArray(item.enclosure), (enclosure) =>
      attr(enclosure, 'type').startsWith('image/'),
    ),
    // `<itunes:image href="…">` / `<image href="…">`.
    ...sizedUrls(toArray(item.image), () => true),
  ];

  for (const html of bodiesOf(body)) {
    const embedded = EMBEDDED_IMG.exec(html);
    if (embedded?.[1]) {
      candidates.push(embedded[1]);
    }
  }

  for (const candidate of candidates) {
    const url = absoluteHttpUrl(candidate, base);
    if (url !== undefined) {
      return url;
    }
  }
  return undefined;
}

function itemDate(item: Node): string | undefined {
  const raw =
    text(item.pubDate) ||
    text(item.published) ||
    text(item.updated) ||
    text(item.date); // dc:date (RSS 1.0)
  if (!raw) {
    return undefined;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeItem(raw: unknown, base: string): RssItem | null {
  if (!isNode(raw)) {
    return null;
  }
  const title = truncate(plainText(text(raw.title)), MAX_TITLE_CHARS);
  if (!title) {
    return null;
  }

  const body = itemText(raw);
  const link = itemLink(raw, base);
  const image = itemImage(raw, body, base);
  const summary = summaryOf(body);
  const published = itemDate(raw);

  // Built key-by-key: `exactOptionalPropertyTypes` means an absent field must be
  // absent, not `undefined` — and a payload with explicit `undefined`s would also
  // serialize differently and churn the change-detection.
  const item: RssItem = { title };
  if (link !== undefined) item.link = link;
  if (summary) item.summary = summary;
  if (image !== undefined) item.imageUrl = image;
  if (published !== undefined) item.publishedAt = published;
  return item;
}

/**
 * Locate the feed's channel and its stories across the three dialects in the
 * wild: RSS 2.0 (`rss > channel > item`), Atom (`feed > entry`) and RSS 1.0 /
 * RDF (`RDF > channel` with the items as its *siblings*).
 */
function parseFeed(xml: string, base: string): RssPayload {
  const doc = parser.parse(xml) as Node;

  const rss = isNode(doc.rss) ? doc.rss : undefined;
  const rdf = isNode(doc.RDF) ? doc.RDF : undefined;
  const atom = isNode(doc.feed) ? doc.feed : undefined;

  const channelSource = rss ?? rdf;
  const channelNode = channelSource ? channelSource.channel : undefined;
  const channel = isNode(channelNode) ? channelNode : atom;

  if (!channel) {
    throw new Error('rss: not an RSS or Atom feed');
  }

  // RSS 1.0 hangs its items off the root, beside <channel>, not inside it.
  const rawItems = [
    ...toArray(channel.item),
    ...toArray(channel.entry),
    ...(rdf ? toArray(rdf.item) : []),
  ];

  const items: RssItem[] = [];
  for (const raw of rawItems) {
    const item = normalizeItem(raw, base);
    if (item) {
      items.push(item);
    }
    if (items.length >= MAX_STORED_ITEMS) {
      break;
    }
  }

  const payload: RssPayload = { title: plainText(text(channel.title)), items };
  const link = itemLink(channel, base);
  if (link !== undefined) payload.link = link;
  return payload;
}

/**
 * Strip the DTD before parsing. A feed never needs one, and an internal entity
 * definition is a memory-exhaustion vector ("billion laughs") arriving from a URL
 * the operator chose but nobody vetted — the 5 MB body cap in `safeFetchText`
 * bounds the *input*, not what an expansion turns it into.
 */
function stripDoctype(xml: string): string {
  return xml.replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?[^>]*>/gi, '');
}

/**
 * The feed URL reduced to the thing that actually identifies the feed, so two
 * operators who spell the same address slightly differently still share a single
 * upstream fetch. Without this, `…/feed` and `…/feed/` hash apart and quietly
 * cost two fetches and two cache documents — defeating the fan-out the whole
 * connector is built around. Falls back to the raw string if it won't parse
 * (fetchData rejects it a moment later anyway).
 */
function normalizeFeedUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    url.hostname = url.hostname.toLowerCase();
    url.hash = '';
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    return url.toString();
  } catch {
    return trimmed;
  }
}

/**
 * RSS / Atom connector. The cache key is a hash of the feed URL, so every screen
 * showing the same feed shares one fetch regardless of how each is styled.
 *
 * This is the only connector that fetches an address the operator typed, which
 * is why every request goes through {@link safeFetchText} — see the SSRF notes
 * there. Treat the response as hostile: it is the one input to this system that
 * a stranger controls.
 */
export const rssConnector: AppConnector<RssConfig, RssPayload> = {
  cacheKey(config) {
    return `rss:${createHash('sha1')
      .update(normalizeFeedUrl(config.url ?? ''))
      .digest('hex')}`;
  },

  async fetchData(
    config: RssConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<RssPayload>> {
    const url = (config.url ?? '').trim();
    if (!url) {
      throw new ConnectorError('config_invalid', 'rss: missing feed url');
    }

    const xml = await safeFetchText(
      url,
      ctx.signal ? { signal: ctx.signal } : {},
    );
    const payload = parseFeed(stripDoctype(xml), url);

    // An empty feed is a failure, not an empty screen: throwing keeps the last
    // good payload on the wall and records the error for the operator.
    if (payload.items.length === 0) {
      throw new Error('rss: no items parsed');
    }

    ctx.logger.debug('rss fetched', { url, items: payload.items.length });
    return { playerPayload: payload };
  },
};
