import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  upload: true,
  fields: [
    { name: 'alt', type: 'text', localized: true },
    {
      name: 'caption',
      type: 'text',
      localized: true,
      admin: { description: 'Shown under the image in article bodies.' },
    },
    /* Stock provenance. Pexels does not require attribution, but keeping the
       photographer and source URL on the record is what makes the licence
       auditable a year from now — and it costs three fields. */
    { name: 'credit', type: 'text', admin: { description: 'Photographer name.' } },
    { name: 'creditUrl', type: 'text', admin: { description: 'Photographer profile URL.' } },
    { name: 'sourceUrl', type: 'text', admin: { description: 'Original photo page.' } },
  ],
}
