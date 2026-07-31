import type { CheckboxFieldValidation, Field, PayloadRequest } from 'payload'

import { validateCanonicalUrl } from './url'

interface LegacyMetaFieldsOptions {
  descriptionFallback: string
  titleFallback: string
}

interface SeoFieldOptions {
  contentFields: string[]
  indexableDefault?: boolean
  minimumWords: number
  validateIndexable?: CheckboxFieldValidation
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

const ignoredContentKeys = new Set([
  'detail',
  'direction',
  'format',
  'id',
  'indent',
  'mode',
  'relationTo',
  'style',
  'type',
  'version',
])

function visibleText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(visibleText).join(' ')
  const object = record(value)
  if (!object) return ''
  return Object.entries(object)
    .filter(([key]) => !ignoredContentKeys.has(key))
    .map(([, child]) => visibleText(child))
    .join(' ')
}

function wordCount(value: string): number {
  return value.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’–—-]*/gu)?.length ?? 0
}

function intentFingerprint(value: string, locale: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase(locale)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

type ContentCollection = 'app-pages' | 'posts' | 'solutions'

const contentCollections = new Set<ContentCollection>(['app-pages', 'posts', 'solutions'])

function isContentCollection(value: string | undefined): value is ContentCollection {
  return value !== undefined && contentCollections.has(value as ContentCollection)
}

async function loadCurrentDocument({
  collection,
  id,
  locale,
  req,
}: {
  collection: ContentCollection
  id: number | string
  locale: 'en' | 'sr'
  req: PayloadRequest
}): Promise<Record<string, unknown> | null> {
  const document = await req.payload.findByID({
    collection,
    id,
    locale,
    fallbackLocale: false,
    draft: true,
    depth: 0,
  })
  return record(document)
}

function mergeDocument(
  current: Record<string, unknown> | null,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const currentIntent = record(current?.intent) ?? {}
  const incomingIntent = record(incoming.intent) ?? {}

  return {
    ...(current ?? {}),
    ...incoming,
    intent: { ...currentIntent, ...incomingIntent },
  }
}

const INTENT_STOP_WORDS = new Set([
  'and',
  'app',
  'apps',
  'digital',
  'ekran',
  'ekrane',
  'ekrani',
  'for',
  'how',
  'ili',
  'iz',
  'kako',
  'na',
  'od',
  'sa',
  'signage',
  'the',
  'to',
  'u',
  'za',
])

function intentTokens(value: unknown, locale: string): Set<string> {
  const intent = record(value)
  if (!intent) return new Set()

  const copy = ['primaryQuery', 'audience', 'jobToBeDone', 'uniquePromise']
    .map((key) => (typeof intent[key] === 'string' ? intent[key] : ''))
    .join(' ')

  return new Set(
    intentFingerprint(copy, locale)
      .split(' ')
      .filter((token) => token.length > 2 && !INTENT_STOP_WORDS.has(token)),
  )
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0
  const shared = [...left].filter((token) => right.has(token)).length
  return shared / (left.size + right.size - shared)
}

function indexableValidator({
  contentFields,
  minimumWords,
}: Pick<SeoFieldOptions, 'contentFields' | 'minimumWords'>): CheckboxFieldValidation {
  return async (value, { collectionSlug, data, id, req }) => {
    if (value !== true) return true

    const locale = req.locale === 'sr' ? 'sr' : 'en'
    const incoming = record(data) ?? {}
    const needsCurrentDocument =
      id !== undefined &&
      isContentCollection(collectionSlug) &&
      (!record(incoming.intent) || contentFields.some((field) => incoming[field] === undefined))
    const current =
      needsCurrentDocument && isContentCollection(collectionSlug)
        ? await loadCurrentDocument({ collection: collectionSlug, id, locale, req })
        : null
    const document = mergeDocument(current, incoming)
    const intent = record(document.intent)
    const requiredIntent = [
      ['primaryQuery', 'primary query', 2],
      ['intentType', 'intent type', 1],
      ['audience', 'audience', 2],
      ['jobToBeDone', 'job to be done', 8],
      ['uniquePromise', 'unique promise', 8],
    ] as const
    const missing = requiredIntent
      .filter(([key, , minimumIntentWords]) => {
        const fieldValue = intent?.[key]
        return typeof fieldValue !== 'string' || wordCount(fieldValue.trim()) < minimumIntentWords
      })
      .map(([, label, minimumIntentWords]) => `${label} (${String(minimumIntentWords)}+ words)`)

    if (missing.length > 0) {
      return `Complete the search-intent brief before indexing: ${missing.join(', ')}.`
    }

    const copy = contentFields.map((field) => visibleText(document[field])).join(' ')
    const words = wordCount(copy)
    if (words < minimumWords) {
      return `Add substantive, page-specific content before indexing (${String(words)}/${String(minimumWords)} words).`
    }

    const primaryQuery = typeof intent?.primaryQuery === 'string' ? intent.primaryQuery : ''
    const fingerprint = intentFingerprint(primaryQuery, locale)
    const queries = await Promise.all([
      req.payload.find({
        collection: 'posts',
        locale,
        fallbackLocale: false,
        draft: true,
        depth: 0,
        limit: 1000,
        select: { intent: true },
      }),
      req.payload.find({
        collection: 'solutions',
        locale,
        fallbackLocale: false,
        draft: true,
        depth: 0,
        limit: 1000,
        select: { intent: true },
      }),
      req.payload.find({
        collection: 'app-pages',
        locale,
        fallbackLocale: false,
        draft: true,
        depth: 0,
        limit: 1000,
        select: { intent: true },
      }),
    ])
    const candidates = queries.flatMap((result) => result.docs).filter((doc) => doc.id !== id)
    const exactConflict = candidates.find(
      (doc) => intentFingerprint(doc.intent?.primaryQuery ?? '', locale) === fingerprint,
    )

    if (exactConflict) {
      return `Another page already targets this primary query (document ${exactConflict.id}).`
    }

    const tokens = intentTokens(intent, locale)
    const similarConflict = candidates
      .map((doc) => ({
        id: doc.id,
        similarity: jaccardSimilarity(tokens, intentTokens(doc.intent, locale)),
      }))
      .find(({ similarity }) => tokens.size >= 8 && similarity >= 0.78)

    return similarConflict
      ? `This intent brief is too similar to document ${similarConflict.id} (${String(Math.round(similarConflict.similarity * 100))}% overlap). Give the page a distinct job and unique promise before indexing.`
      : true
  }
}

/**
 * Keeps the existing flat metadata contract alive while Posts and Solutions
 * migrate to the shared `seo` group. Current route code and seeded documents
 * still read these field names.
 */
export function legacyMetaFields({
  descriptionFallback,
  titleFallback,
}: LegacyMetaFieldsOptions): Field[] {
  return [
    {
      name: 'metaTitle',
      type: 'text',
      localized: true,
      admin: {
        description: `${titleFallback} Aim for under ~60 characters.`,
      },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      localized: true,
      admin: {
        description: `${descriptionFallback} Aim for 140–160 characters.`,
      },
    },
  ]
}

/**
 * Shared metadata model for all editorial page types. It is localised as one
 * group so canonical, robots and social presentation cannot accidentally be
 * copied from a different language.
 */
export function seoField({
  contentFields,
  indexableDefault,
  minimumWords,
  validateIndexable,
}: SeoFieldOptions): Field {
  const validateContent = indexableValidator({ contentFields, minimumWords })

  return {
    name: 'seo',
    type: 'group',
    localized: true,
    admin: {
      description:
        'Search and social metadata for this language. Keep canonical override empty unless consolidating a known duplicate.',
    },
    fields: [
      {
        name: 'metaTitle',
        type: 'text',
        admin: {
          description: 'Search-result title. Aim for under ~60 characters.',
        },
      },
      {
        name: 'metaDescription',
        type: 'textarea',
        admin: {
          description: 'Search-result description. Aim for 140–160 characters.',
        },
      },
      {
        name: 'ogTitle',
        label: 'Open Graph title',
        type: 'text',
        admin: { description: 'Falls back to the meta title.' },
      },
      {
        name: 'ogDescription',
        label: 'Open Graph description',
        type: 'textarea',
        admin: { description: 'Falls back to the meta description.' },
      },
      {
        name: 'ogImage',
        label: 'Open Graph image',
        type: 'upload',
        relationTo: 'media',
      },
      {
        name: 'indexable',
        type: 'checkbox',
        ...(indexableDefault === undefined ? {} : { defaultValue: indexableDefault }),
        validate: async (value, options) => {
          const eligibility = validateIndexable ? await validateIndexable(value, options) : true
          return eligibility === true ? validateContent(value, options) : eligibility
        },
        admin: {
          description:
            'Allow this language version to be indexed once its content is complete and distinct.',
        },
      },
      {
        name: 'canonicalOverride',
        type: 'text',
        validate: validateCanonicalUrl,
        admin: {
          description:
            'Advanced: an absolute canonical URL for deliberate consolidation. Normally leave empty for a self-canonical.',
        },
      },
    ],
  }
}
