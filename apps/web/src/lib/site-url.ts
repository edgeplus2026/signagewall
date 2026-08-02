/**
 * The public origin of the site — the single source for every absolute URL we
 * emit: canonicals, hreflang, sitemap entries, OG `url`s and JSON-LD `@id`s.
 *
 * This used to be `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002'`
 * copied into five files. A deploy that forgot the variable would therefore
 * announce every canonical, every alternate and every entity id as living on
 * localhost — which Google reads as a site that does not exist. The fallback is
 * only safe in development, so that is the only place it survives.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_SITE_URL is not set. A production build needs the public ' +
          'origin (e.g. https://www.signagewall.com) — without it every canonical, ' +
          'hreflang, sitemap URL and JSON-LD id would point at localhost.',
      )
    }
    return 'http://localhost:3002'
  }

  try {
    const url = new URL(raw)
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
    const isOriginOnly =
      (url.pathname === '/' || url.pathname === '') &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    if (!isHttp || !isOriginOnly) throw new Error('invalid public origin')
    return url.origin
  } catch {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, query, ' +
        'fragment or credentials (for example https://www.signagewall.com).',
    )
  }
}

export const SITE_URL = resolveSiteUrl()

/**
 * The one origin this site may be indexed under.
 *
 * Deliberately a constant and not configuration. Indexing policy read from an
 * environment variable fails in both directions and stays silent about it: a
 * development `.env` copied into a deploy takes the live site out of search,
 * and a variable that must be *remembered* on every preview deployment is one
 * forgotten value away from a staging copy competing with the real site. Both
 * are invisible until traffic disappears. Moving the site to another origin is
 * a code change, reviewed like any other.
 */
export const CANONICAL_ORIGIN = 'https://www.signagewall.com'

/**
 * Whether this deployment may appear in search results.
 *
 * Only a production build served from the canonical origin qualifies. Preview
 * and staging deploys are excluded because their origin differs; a dev server —
 * including one published through a tunnel — is excluded because its build is
 * not production. Neither needs a variable set, so neither can have one
 * forgotten.
 */
export const INDEXING_ENABLED =
  process.env.NODE_ENV === 'production' && SITE_URL === CANONICAL_ORIGIN
