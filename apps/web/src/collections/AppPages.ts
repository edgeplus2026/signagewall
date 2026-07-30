import { APP_MANIFESTS, NEWS_MANIFESTS } from '@signagewall/apps'
import type { CheckboxFieldValidation, CollectionConfig, TextFieldValidation } from 'payload'

import { publishedOrAuthenticated } from '../access/published-or-authenticated'
import { intentField } from '../fields/content-intent'
import { publishingFields } from '../fields/publishing'
import { relatedContentFields } from '../fields/related-content'
import { seoField } from '../fields/seo'
import { validateSlug } from '../fields/slug'
import { contentRevalidationHooks } from '../lib/content-revalidation'

const appKeys = new Set(APP_MANIFESTS.map((manifest) => manifest.slug))
const presetOnlyAppKeys = new Set(NEWS_MANIFESTS.map((manifest) => manifest.slug))
const validateAppKey: TextFieldValidation = (value) => {
  if (value === null || value === undefined || value === '') return true
  return appKeys.has(value)
    ? true
    : 'Use a stable app key registered in the @signagewall/apps manifest registry.'
}

const validateAppIndexing: CheckboxFieldValidation = async (value, { data, id, req }) => {
  if (value !== true) return true
  let appKey =
    typeof data === 'object' && 'appKey' in data && typeof data.appKey === 'string'
      ? data.appKey
      : undefined
  if (!appKey && id !== undefined) {
    const current = await req.payload.findByID({
      collection: 'app-pages',
      id,
      draft: true,
      depth: 0,
      select: { appKey: true },
    })
    appKey = current.appKey
  }
  return appKey && presetOnlyAppKeys.has(appKey)
    ? 'Branded news presets share the RSS app intent and cannot be indexed as separate pages.'
    : true
}

/**
 * Editorial representation of a product app.
 *
 * `appKey` points to the technical manifest while all searchable, localised
 * copy lives here. A manifest therefore does not become an indexable marketing
 * page merely by being added to the product registry.
 */
export const AppPages: CollectionConfig = {
  slug: 'app-pages',
  labels: {
    singular: 'App page',
    plural: 'App pages',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'appKey', 'slug', 'localeReady', '_status'],
    group: 'Content',
  },
  access: { read: publishedOrAuthenticated },
  versions: { drafts: true },
  hooks: contentRevalidationHooks('app-pages'),
  defaultSort: 'order',
  fields: [
    {
      name: 'appKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateAppKey,
      admin: {
        description:
          'Stable key from @signagewall/apps. It joins this page to product behaviour and must not change when the SEO slug changes.',
        position: 'sidebar',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      admin: {
        description: 'Ascending order on curated app lists.',
        position: 'sidebar',
      },
    },
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
          'Localised marketing URL segment. It is independent from appKey so a technical key such as "gcal" can use "google-calendar".',
      },
    },
    {
      name: 'heroTitle',
      type: 'text',
      localized: true,
      admin: { description: 'Page heading. Falls back to the app name.' },
    },
    {
      name: 'summary',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'A concise statement of the problem this app solves and who it solves it for.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
      admin: {
        description:
          'Unique narrative content. Explain the workflow and value instead of paraphrasing the product manifest.',
      },
    },
    {
      name: 'benefits',
      type: 'array',
      localized: true,
      labels: { singular: 'Benefit', plural: 'Benefits' },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'features',
      type: 'array',
      localized: true,
      labels: { singular: 'Feature', plural: 'Features' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
    {
      name: 'useCases',
      type: 'array',
      localized: true,
      labels: { singular: 'Use case', plural: 'Use cases' },
      admin: {
        description:
          'Concrete jobs and settings for this app. These should not repeat the generic feature list.',
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
    {
      name: 'setupSteps',
      type: 'array',
      localized: true,
      labels: { singular: 'Setup step', plural: 'Setup steps' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
    {
      name: 'requirements',
      type: 'group',
      localized: true,
      admin: {
        description:
          'User-facing account, data, network and playback constraints. Keep these factual and consistent with the technical manifest.',
      },
      fields: [
        { name: 'account', type: 'textarea' },
        { name: 'dataSource', type: 'textarea' },
        { name: 'network', type: 'textarea' },
        { name: 'refreshBehavior', type: 'textarea' },
        { name: 'offlineBehavior', type: 'textarea' },
        { name: 'limitations', type: 'textarea' },
      ],
    },
    {
      name: 'screenshots',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      maxRows: 8,
      admin: {
        description:
          'Real interface or output images. Avoid decorative mockups that imply unsupported behaviour.',
      },
    },
    {
      name: 'faq',
      type: 'array',
      localized: true,
      labels: { singular: 'Question', plural: 'FAQ' },
      fields: [
        { name: 'q', type: 'text', required: true },
        { name: 'a', type: 'textarea', required: true },
      ],
    },
    intentField(),
    seoField({
      contentFields: [
        'summary',
        'content',
        'benefits',
        'features',
        'useCases',
        'setupSteps',
        'requirements',
        'faq',
      ],
      indexableDefault: false,
      minimumWords: 250,
      validateIndexable: validateAppIndexing,
    }),
    ...publishingFields({ localeReadyDefault: false }),
    ...relatedContentFields({
      appsDescription:
        'Alternative or complementary apps. Do not select this page itself and do not create a generic app carousel.',
    }),
  ],
}
