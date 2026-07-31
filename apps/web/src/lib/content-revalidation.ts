import { revalidatePath, revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, TypeWithID } from 'payload'

export type ContentCollection = 'posts' | 'solutions' | 'app-pages' | 'redirects'

interface ContentRevalidationHooks {
  afterChange: CollectionAfterChangeHook<TypeWithID>[]
  afterDelete: CollectionAfterDeleteHook<TypeWithID>[]
}

const PATHS: Record<ContentCollection, readonly string[]> = {
  posts: ['/blog', '/sr/blog'],
  solutions: ['/solutions', '/sr/resenja'],
  'app-pages': ['/apps', '/sr/aplikacije'],
  // A redirect can change the result of any content lookup.
  redirects: ['/', '/sr'],
}

const RELATED_CONTENT_PATHS = [...PATHS.posts, ...PATHS.solutions, ...PATHS['app-pages']] as const

/**
 * Invalidates every public consumer of one editorial collection.
 *
 * Payload and the marketing routes live in the same Next application, so a
 * publish can invalidate the affected hub, detail layouts, cached relationship
 * queries and the sitemap without an external webhook.
 */
export function revalidateContent(collection: ContentCollection): void {
  const paths = collection === 'redirects' ? PATHS.redirects : RELATED_CONTENT_PATHS
  for (const path of paths) {
    revalidatePath(path, 'layout')
  }
  revalidatePath('/sitemap.xml', 'page')

  if (collection === 'redirects') {
    revalidateTag('redirects', 'max')
    return
  }

  revalidateTag(collection, 'max')
  if (collection === 'app-pages' || collection === 'solutions') {
    // These collections form a reciprocal link graph.
    revalidateTag('app-solution-links', 'max')
  }
}

/**
 * Payload's CLI and seed scripts can execute collection hooks without a Next
 * request cache. A missing revalidation context must not make an otherwise
 * valid content write fail.
 */
function safelyRevalidateContent(collection: ContentCollection): void {
  try {
    revalidateContent(collection)
  } catch {
    // Revalidation is a cache optimisation; the next uncached request remains correct.
  }
}

export function contentRevalidationHooks(collection: ContentCollection): ContentRevalidationHooks {
  return {
    afterChange: [
      ({ doc }) => {
        safelyRevalidateContent(collection)
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        safelyRevalidateContent(collection)
        return doc
      },
    ],
  }
}
