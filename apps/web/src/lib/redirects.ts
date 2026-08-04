import { unstable_cache } from 'next/cache'
import { permanentRedirect, redirect as temporaryRedirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/payload'
import {
  contentRedirectStatus,
  normaliseRedirectPath,
  type ContentRedirectStatus,
} from '@/lib/redirect-path'

export interface ContentRedirect {
  preserveQuery: boolean
  statusCode: ContentRedirectStatus
  toPath: string
}

export type ContentSearchParams = Record<string, string | string[] | undefined>

const queryRedirect = unstable_cache(
  async (pathname: string): Promise<ContentRedirect | null> => {
    const fromPath = normaliseRedirectPath(pathname)
    if (!fromPath) return null

    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'redirects',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { active: { equals: true } },
          { fromPath: { equals: fromPath } },
        ],
      },
      depth: 0,
      limit: 1,
    })
    const redirect = docs[0]
    const toPath = normaliseRedirectPath(redirect?.toPath ?? '')
    if (!redirect || !toPath || toPath === fromPath) return null

    return {
      toPath,
      statusCode: contentRedirectStatus(redirect.statusCode),
      preserveQuery: redirect.preserveQuery !== false,
    }
  },
  ['content-redirect'],
  { revalidate: 3600, tags: ['redirects'] },
)

/** Looks up an exact, internal public path. Redirect chains are intentionally
 * not followed here; the content audit and editorial workflow should collapse
 * old paths directly onto the final canonical URL. */
export async function findContentRedirect(pathname: string): Promise<ContentRedirect | null> {
  const normalised = normaliseRedirectPath(pathname)
  return normalised ? queryRedirect(normalised) : null
}

function destinationWithQuery(
  toPath: string,
  searchParams: ContentSearchParams,
  preserveQuery: boolean,
): string {
  if (!preserveQuery) return toPath

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item)
    } else if (value !== undefined) {
      query.append(key, value)
    }
  }

  const serialized = query.toString()
  return serialized ? `${toPath}?${serialized}` : toPath
}

/**
 * Applies a CMS redirect using only statuses supported by Next's App Router
 * redirect errors. This must be called from a Server Component render path.
 *
 * `searchParams` is optional because most callers cannot supply it. Reading it
 * is a dynamic API, and the Blog, Solutions and Apps detail routes are all
 * prerendered — at build for known slugs, on demand through ISR for the rest —
 * so touching it there aborts the render with `DYNAMIC_SERVER_USAGE` and
 * answers 500 where a 308 was intended. Those routes call this with the
 * redirect alone and lose the query string; a redirect fires on a URL that is
 * already wrong, so dropping its query costs far less than dropping the
 * redirect. `preserveQuery` still applies wherever the caller is genuinely
 * dynamic, which today means the top-level catch-all.
 */
export function executeContentRedirect(
  redirect: ContentRedirect,
  searchParams: ContentSearchParams = {},
): never {
  const destination = destinationWithQuery(redirect.toPath, searchParams, redirect.preserveQuery)
  if (redirect.statusCode === 307) temporaryRedirect(destination)
  permanentRedirect(destination)
}
