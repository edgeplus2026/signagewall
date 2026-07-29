import { getPayloadClient } from '@/lib/payload'
import type { LocalePaths } from '@/lib/seo'

/**
 * Slug pair + last-modified for every published post — the sitemap's view of the
 * blog. Slugs are localised, so each post contributes a different URL per
 * language and both have to come back from one pass.
 */
export async function listPostRefs(): Promise<{ slug: LocalePaths; updatedAt: string }[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    // See `slugPair`: 'all' widens every localised field to its locale map.
    locale: 'all',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    depth: 0,
    limit: 1000,
    select: { slug: true, updatedAt: true },
  })
  return docs.map((d) => ({ slug: d.slug as unknown as LocalePaths, updatedAt: d.updatedAt }))
}

export interface RelatedPost {
  slug: string
  title: string
  excerpt: string
  coverUrl: string | null
}

/**
 * Three more posts to read, preferring the same category.
 *
 * The blog had no internal links at all: twenty posts, each a dead end. That
 * wastes the only link equity the site generates on its own, and it wastes the
 * reader — somebody who finished a piece on burn-in is the easiest person alive
 * to interest in one about window brightness.
 *
 * Same-category first, then anything else recent, so a thin category still
 * fills the row.
 */
export async function listRelatedPosts(
  locale: string,
  currentId: string,
  categoryId: string | null,
  limit = 3,
): Promise<RelatedPost[]> {
  const payload = await getPayloadClient()

  const query = async (sameCategory: boolean, take: number) => {
    if (take <= 0) return []
    const { docs } = await payload.find({
      collection: 'posts',
      locale: locale as 'sr' | 'en',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { id: { not_equals: currentId } },
          ...(sameCategory && categoryId ? [{ category: { equals: categoryId } }] : []),
        ],
      },
      sort: '-publishedAt',
      depth: 1,
      limit: take,
    })
    return docs
  }

  const primary = categoryId ? await query(true, limit) : []
  const seen = new Set(primary.map((d) => d.id))
  const filler = (await query(false, limit + primary.length)).filter((d) => !seen.has(d.id))

  return [...primary, ...filler].slice(0, limit).map((d) => ({
    slug: d.slug,
    title: d.title,
    excerpt: d.excerpt ?? '',
    coverUrl: typeof d.coverImage === 'object' ? (d.coverImage?.url ?? null) : null,
  }))
}

/**
 * Reading time in minutes, from the stored Lexical document.
 *
 * Walks the tree for `text` nodes rather than stringifying it: the JSON carries
 * a `type`, `format`, `version` and `direction` on every node, so counting
 * words in the serialised form made a 220-word post read as four minutes.
 *
 * 200 words a minute — the usual figure for considered non-fiction, and low
 * enough that the estimate is never an under-promise.
 */
export function readingMinutes(content: unknown): number {
  let words = 0
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (node === null || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (typeof record.text === 'string') {
      words += record.text.split(/\s+/).filter(Boolean).length
    }
    Object.values(record).forEach(walk)
  }
  walk(content)
  return Math.max(1, Math.round(words / 200))
}
