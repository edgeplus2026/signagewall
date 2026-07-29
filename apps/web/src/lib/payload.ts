import config from '@payload-config'
import { getPayload } from 'payload'

import type { LocalePaths } from '@/lib/seo'

/** Cached Payload local-API client for server-side data access (blog). */
export function getPayloadClient() {
  return getPayload({ config })
}

/**
 * Both languages' slugs for one document.
 *
 * A localised field normally comes back as the value for the requested locale;
 * `locale: 'all'` returns the whole map instead. The generated types don't model
 * that — they describe a localised field by its base type whichever locale is
 * asked for — hence the cast.
 */
export async function slugPair(
  collection: 'posts' | 'solutions',
  id: string | number,
): Promise<LocalePaths> {
  const payload = await getPayloadClient()
  const doc = await payload.findByID({
    collection,
    id,
    locale: 'all',
    depth: 0,
    select: { slug: true },
  })
  return doc.slug as unknown as LocalePaths
}
