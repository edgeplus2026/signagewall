import type { CollectionSlug, Field } from 'payload'

// The generated Payload types are intentionally regenerated only after all
// schema work lands. This cast keeps the new collection usable during that
// transition without weakening the rest of the field definitions.
const APP_PAGES_SLUG = 'app-pages' as CollectionSlug

interface RelatedContentOptions {
  appsDescription?: string
  includeApps?: boolean
  includePosts?: boolean
  includeSolutions?: boolean
}

/**
 * Explicit editorial relationships take priority over algorithmic "related"
 * content. Returning fresh configs matters because Payload sanitises fields in
 * place while building its configuration.
 */
export function relatedContentFields({
  appsDescription = 'Apps that directly help the reader complete the job described on this page.',
  includeApps = true,
  includePosts = true,
  includeSolutions = true,
}: RelatedContentOptions = {}): Field[] {
  const fields: Field[] = []

  if (includePosts) {
    fields.push({
      name: 'relatedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      maxRows: 8,
      admin: {
        description: 'Editorially selected guides that deepen or support this page.',
      },
    })
  }

  if (includeSolutions) {
    fields.push({
      name: 'relatedSolutions',
      type: 'relationship',
      relationTo: 'solutions',
      hasMany: true,
      maxRows: 8,
      admin: {
        description: 'Industries for which this content is directly useful.',
      },
    })
  }

  if (includeApps) {
    fields.push({
      name: 'relatedApps',
      type: 'relationship',
      relationTo: APP_PAGES_SLUG,
      hasMany: true,
      maxRows: 8,
      admin: { description: appsDescription },
    })
  }

  return fields
}
