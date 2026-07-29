import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', '_status'],
  },
  access: { read: () => true },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      localized: true,
      admin: {
        description:
          'URL segment, per language — /blog/<slug> and /en/blog/<slug>. Write it in the language of the post. Changing it breaks existing links.',
      },
    },
    { name: 'excerpt', type: 'textarea', localized: true },
    /* Same pair as Solutions. Without them the <title> was the raw headline —
       written to be read on the page, not to win a click in a result list —
       and the description was whatever the excerpt happened to be. */
    {
      name: 'metaTitle',
      type: 'text',
      localized: true,
      admin: {
        description:
          'Search-result title. Falls back to the post title. Aim for under ~60 characters and lead with the term people search for.',
      },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      localized: true,
      admin: { description: 'Falls back to the excerpt. Aim for 140–160 characters.' },
    },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    { name: 'publishedAt', type: 'date' },
    { name: 'content', type: 'richText', localized: true },
  ],
}
