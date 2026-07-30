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
import { contentRevalidationHooks } from '../lib/content-revalidation'
import { SOLUTION_ICON_KEYS } from '../lib/solution-icons'

/**
 * One industry page each. Content lives here rather than in code so the copy can
 * be edited without a deploy; the *icon* stays a code-side key because a React
 * component can't be stored in Mongo.
 *
 * `faq` is not decoration: the same factual answers feed the visible page and
 * structured data, so the two representations cannot drift apart.
 */
export const Solutions: CollectionConfig = {
  slug: 'solutions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order', '_status'],
    group: 'Content',
  },
  access: { read: publishedOrAuthenticated },
  versions: { drafts: true },
  hooks: {
    ...contentRevalidationHooks('solutions'),
    beforeValidate: [initializeSeoWorkflow],
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
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
          'URL segment, per language — /solutions/<slug> and /sr/resenja/<slug>. Changing it requires a redirect.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      admin: { description: 'Ascending. Ties fall back to name.' },
    },
    {
      name: 'icon',
      type: 'select',
      required: true,
      options: SOLUTION_ICON_KEYS.map((key) => ({ label: key, value: key })),
      admin: { description: 'Resolved to a Lucide icon in src/lib/solution-icons.ts.' },
    },
    {
      name: 'tagline',
      type: 'textarea',
      required: true,
      localized: true,
      admin: { description: 'Two sentences. Shown on the overview card — make it earn the click.' },
    },
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'subtitle', type: 'textarea', localized: true },
    ...legacyMetaFields({
      titleFallback: 'Falls back to the page title.',
      descriptionFallback: 'Falls back to the subtitle.',
    }),
    {
      name: 'intro',
      type: 'textarea',
      localized: true,
      admin: {
        description:
          'Two or three paragraphs (blank line between them) on why a screen belongs in this industry — the context before the scenarios. This is most of what makes the page rank; without it the page is a list.',
      },
    },
    {
      name: 'scenarios',
      type: 'array',
      localized: true,
      minRows: 1,
      labels: { singular: 'Scenario', plural: 'Scenarios' },
      admin: { description: 'Aim for five or six. Three reads as a stub.' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
    {
      name: 'proof',
      type: 'group',
      localized: true,
      label: 'Practical example',
      admin: {
        description:
          'A clearly labelled illustrative workflow or calculation. Never present an invented example as a customer result, and do not promise an outcome that has not been measured.',
      },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'body', type: 'textarea' },
      ],
    },
    {
      name: 'recommendedApps',
      type: 'text',
      admin: {
        description:
          'Legacy comma-separated app keys. Existing pages still read this field; migrate values to Related apps before retiring it.',
      },
    },
    {
      name: 'benefits',
      type: 'array',
      localized: true,
      minRows: 1,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'faq',
      type: 'array',
      localized: true,
      labels: { singular: 'Question', plural: 'FAQ' },
      admin: {
        description:
          'Eight to ten. Write them as they get asked on a sales call, and answer at a length worth reading — a one-line answer is the shape nothing ever cites. Avoid reusing an answer across industries: twenty pages carrying the same sentence is what thin content looks like to a crawler.',
      },
      fields: [
        { name: 'q', type: 'text', required: true },
        { name: 'a', type: 'textarea', required: true },
      ],
    },
    intentField(),
    seoWorkflowVersionField(),
    seoField({
      contentFields: ['tagline', 'subtitle', 'intro', 'scenarios', 'proof', 'benefits', 'faq'],
      minimumWords: 300,
    }),
    ...publishingFields(),
    ...relatedContentFields({
      appsDescription:
        'Structured replacement for the legacy Recommended apps keys. Select the app pages that genuinely support this industry.',
    }),
  ],
}
