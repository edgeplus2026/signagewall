import type { CollectionConfig } from 'payload'

import { publishedOrAuthenticated } from '../access/published-or-authenticated'
import { intentField } from '../fields/content-intent'
import {
  initializeSeoWorkflow,
  publishingFields,
  seoWorkflowVersionField,
} from '../fields/publishing'
import { relatedContentFields } from '../fields/related-content'
import { legacyMetaFields, seoField } from '../fields/seo'
import { validateSlug } from '../fields/slug'
import { validateAbsoluteHttpUrl } from '../fields/url'
import { contentRevalidationHooks } from '../lib/content-revalidation'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', '_status'],
    group: 'Content',
  },
  access: { read: publishedOrAuthenticated },
  versions: { drafts: true },
  hooks: {
    ...contentRevalidationHooks('posts'),
    beforeValidate: [initializeSeoWorkflow],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      localized: true,
      validate: validateSlug,
      admin: {
        description:
          'URL segment, per language — /blog/<slug> and /sr/blog/<slug>. Write it in the language of the post. Changing it requires a redirect.',
      },
    },
    { name: 'excerpt', type: 'textarea', localized: true },
    ...legacyMetaFields({
      titleFallback:
        'Search-result title. Falls back to the post title and should lead with the term people search for.',
      descriptionFallback: 'Falls back to the excerpt.',
    }),
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    { name: 'publishedAt', type: 'date' },
    { name: 'content', type: 'richText', localized: true },
    {
      name: 'keyTakeaways',
      type: 'array',
      localized: true,
      labels: { singular: 'Key takeaway', plural: 'Key takeaways' },
      admin: {
        description:
          'Optional concise conclusions for readers. Do not use these to repeat the introduction.',
      },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'references',
      type: 'array',
      localized: true,
      labels: { singular: 'Reference', plural: 'References' },
      admin: {
        description: 'Primary sources and evidence used for claims in this language version.',
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'url', type: 'text', required: true, validate: validateAbsoluteHttpUrl },
      ],
    },
    intentField(),
    seoWorkflowVersionField(),
    seoField({
      contentFields: ['excerpt', 'content', 'keyTakeaways'],
      minimumWords: 350,
    }),
    ...publishingFields(),
    ...relatedContentFields(),
  ],
}
