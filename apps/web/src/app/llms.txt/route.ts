import { ROUTE_KEYWORDS } from '@/content/keywords'
import { INDEXING_ENABLED, SITE_URL } from '@/lib/site-url'

/**
 * `/llms.txt` — a plain-text index for assistants that read a site rather than
 * crawl it, in the format described at llmstxt.org.
 *
 * Generated rather than checked in as `public/llms.txt` for the same reason the
 * sitemap is: a hand-written list of pages is correct on the day it is written
 * and wrong the first time a route is added. The descriptions come from
 * `content/keywords`, which already states what each page is for and who it is
 * for — the same briefs the content audit holds the copy to, so the summary an
 * assistant reads cannot describe a page differently from the page itself.
 *
 * English only, deliberately. The file is one document at the origin root, and
 * a reader that wants Serbian is pointed at it rather than served both
 * interleaved.
 */

/**
 * A primary query is stored the way it is typed into a search box — lower case,
 * acronyms included. As a link label it wants a capital and its acronyms back.
 */
function label(query: string): string {
  const sentence = query.charAt(0).toUpperCase() + query.slice(1)
  return sentence.replace(/\b(cms|hdmi|qr)\b/gi, (word) => word.toUpperCase())
}

const SECTIONS: { title: string; routes: string[] }[] = [
  {
    title: 'Product',
    routes: ['/', '/features', '/apps', '/pricing', '/solutions', '/hardware', '/download'],
  },
  {
    title: 'Guides',
    routes: ['/what-is-digital-signage', '/how-it-works', '/blog'],
  },
  {
    title: 'Company',
    routes: ['/about', '/contact'],
  },
]

export function GET(): Response {
  if (!INDEXING_ENABLED) {
    return new Response('', { status: 404 })
  }

  const byRoute = new Map(ROUTE_KEYWORDS.map((entry) => [entry.route, entry]))
  const lines: string[] = [
    '# SignageWall',
    '',
    '> Digital signage software for menus, offers and announcements. SignageWall turns any',
    '> television into a screen you update in seconds, from a browser or a phone — one screen',
    '> or two hundred, and they keep playing when the internet drops.',
    '',
    'Runs on Android, Windows, macOS and Linux, on any display with an HDMI input.',
    `Priced per screen per month, published at ${SITE_URL}/pricing. Serbian edition at ${SITE_URL}/sr.`,
    '',
  ]

  for (const section of SECTIONS) {
    lines.push(`## ${section.title}`, '')
    for (const route of section.routes) {
      const entry = byRoute.get(route)
      if (!entry) continue
      /* English paths are the internal routes verbatim — only the Serbian ones
         are rewritten — so the origin and the route compose directly here. */
      const url = route === '/' ? SITE_URL : `${SITE_URL}${route}`
      /* `uniquePromise`, not `jobToBeDone`: the brief states the latter from
         the visitor's side ("Decide which software to run their screens on"),
         and a link index wants a description of the page, not of its reader. */
      lines.push(`- [${label(entry.en.primaryQuery)}](${url}): ${entry.en.uniquePromise}`)
    }
    lines.push('')
  }

  lines.push(
    '## Optional',
    '',
    `- [Sitemap](${SITE_URL}/sitemap.xml): every page in both languages, with hreflang alternates.`,
    `- [Blog feed](${SITE_URL}/blog/feed.xml): new guides as they are published.`,
    '',
  )

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
