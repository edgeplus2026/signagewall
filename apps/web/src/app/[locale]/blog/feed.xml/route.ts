import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'

import { routing } from '@/i18n/routing'
import { contentRecordIsApproved, getPayloadClient } from '@/lib/payload'
import { absoluteUrl } from '@/lib/seo'

/**
 * RSS for the blog, one feed per language.
 *
 * The site could be read but not followed: a reader who liked one post had no
 * way to hear about the next short of remembering to come back. Aggregators are
 * in the same position — several of them pick up new signage writing by polling
 * feeds, and a blog without one is invisible to all of them.
 *
 * Mirrors the listing page's query exactly, including the editorial gate, so a
 * post that is not fit to appear on /blog cannot leak out through the feed.
 */

/** Matches the pages it summarises; a feed reader polls far less often anyway. */
export const revalidate = 172_800

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/** `&`, `<` and `>` in a title would otherwise close the element early. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    locale,
    fallbackLocale: false,
    where: {
      and: [{ _status: { equals: 'published' } }, { localeReady: { not_equals: false } }],
    },
    sort: '-publishedAt',
    depth: 0,
    limit: 100,
  })

  const items = docs
    .filter((post) => Boolean(post.slug && post.title) && contentRecordIsApproved(post))
    .map((post) => {
      const url = absoluteUrl(locale, {
        pathname: '/blog/[slug]',
        params: { slug: post.slug },
      })
      const published = post.publishedAt ?? post.createdAt
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        /* The link doubles as the identifier: these URLs are canonical and do
           not change, which is exactly what a guid needs to be. */
        `      <guid isPermaLink="true">${url}</guid>`,
        published ? `      <pubDate>${new Date(published).toUTCString()}</pubDate>` : '',
        post.excerpt ? `      <description>${escapeXml(post.excerpt)}</description>` : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })

  /* Built from the listing URL rather than passed to `absoluteUrl`: the typed
     pathname map covers pages, and the feed is not one. Appending keeps it
     correct if either language ever localises the /blog segment. */
  const blogUrl = absoluteUrl(locale, '/blog')
  const feedUrl = `${blogUrl}/feed.xml`
  const title = locale === 'sr' ? 'SignageWall — Blog' : 'SignageWall — Blog'
  const description =
    locale === 'sr'
      ? 'Tekstovi o digitalnoj signalizaciji: šta prikazati na ekranu, kako to održavati i šta se isplati.'
      : 'Writing on digital signage: what to put on a screen, how to keep it running, and what pays off.'

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${blogUrl}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    `    <language>${locale}</language>`,
    `    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n')

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
