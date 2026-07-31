// @ts-nocheck
/**
 * Reviewable rollout helper for repository-seeded Posts and Solutions.
 *
 * Default mode is dry-run. Add `--apply` only after reviewing the report:
 *   pnpm payload run scripts/backfill-seo-publishing.ts
 *   pnpm payload run scripts/backfill-seo-publishing.ts -- --apply
 * Package scripts expose the same two modes as `seo:backfill` and
 * `seo:backfill:apply`.
 *
 * Locales that already have a primaryQuery are editor-owned and skipped.
 * Repository copy is used only when a locale has no editor-owned intent yet.
 * Word-count gates still fail closed if a source later becomes incomplete.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { POSTS } from './data/posts'
import { POSTS_FULL } from './data/posts-full'
import { SOLUTIONS } from './data/solutions-curated'

const apply = process.argv.includes('--apply') || process.argv.includes('apply')
const payload = await getPayload({ config })

function flatten(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flatten).join(' ')
  if (value && typeof value === 'object') return Object.values(value).map(flatten).join(' ')
  return ''
}

function words(value) {
  return flatten(value).match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’–—-]*/gu)?.length ?? 0
}

function blockWords(blocks) {
  return words((blocks ?? []).map((block) => (Array.isArray(block) ? block[1] : '')))
}

const changes = []

async function updateLocale(collection, id, locale, data, label) {
  const current = await payload.findByID({
    collection,
    id,
    locale,
    fallbackLocale: false,
    depth: 0,
  })
  if (current.intent?.primaryQuery) {
    changes.push({ label, action: 'skip', reason: 'intent already editor-owned' })
    return
  }

  changes.push({
    label,
    action: apply ? 'update' : 'would update',
    indexable: data.seo.indexable,
  })
  if (apply) {
    await payload.update({ collection, id, locale, data })
  }
}

for (const post of POSTS) {
  const match = await payload.find({
    collection: 'posts',
    locale: 'sr',
    fallbackLocale: false,
    where: { slug: { equals: post.slug } },
    depth: 0,
    limit: 1,
  })
  const id = match.docs[0]?.id
  if (!id) {
    changes.push({ label: `post:${post.slug}`, action: 'skip', reason: 'not found' })
    continue
  }

  for (const locale of ['sr', 'en']) {
    const copy = post[locale]
    const editorial = POSTS_FULL[post.slug]?.[locale]
    if (!editorial) throw new Error(`missing full editorial content for ${post.slug}:${locale}`)
    const body = editorial.content
    const bodyWordCount = blockWords(body)
    await updateLocale(
      'posts',
      id,
      locale,
      {
        seoWorkflowVersion: 1,
        intent: editorial.intent,
        seo: {
          metaTitle: copy.metaTitle,
          metaDescription: copy.metaDescription,
          indexable: bodyWordCount >= 350,
        },
        localeReady: true,
      },
      `post:${post.slug}:${locale} (${bodyWordCount} body words)`,
    )
  }
}

for (const solution of SOLUTIONS) {
  const match = await payload.find({
    collection: 'solutions',
    locale: 'sr',
    fallbackLocale: false,
    where: { slug: { equals: solution.srSlug } },
    depth: 0,
    limit: 1,
  })
  const id = match.docs[0]?.id
  if (!id) {
    changes.push({ label: `solution:${solution.slug}`, action: 'skip', reason: 'not found' })
    continue
  }

  for (const locale of ['sr', 'en']) {
    const copy = solution[locale]
    const supportingWords = words({
      intro: copy.intro,
      scenarios: copy.scenarios,
      benefits: copy.benefits,
      proof: copy.proof,
      faq: copy.faq,
    })
    await updateLocale(
      'solutions',
      id,
      locale,
      {
        seoWorkflowVersion: 1,
        intent: copy.intent,
        seo: {
          metaTitle: copy.metaTitle,
          metaDescription: copy.metaDescription,
          indexable: supportingWords >= 300,
        },
        localeReady: true,
      },
      `solution:${solution.slug}:${locale} (${supportingWords} supporting words)`,
    )
  }
}

for (const change of changes) {
  const state = change.indexable === undefined ? '' : `, indexable=${String(change.indexable)}`
  const reason = change.reason ? ` (${change.reason})` : ''
  console.log(`${change.action.padEnd(12)} ${change.label}${state}${reason}`)
}

console.log(
  apply
    ? '\nBackfill applied. Run the content audits before enabling SEO_STRICT_CONTENT_GATES.'
    : '\nDry run only. Re-run with --apply after reviewing every proposed change.',
)
process.exit(0)
