// @ts-nocheck
/**
 * Non-destructively retire the 14 industry pages removed from the curated
 * Solutions catalog.
 *
 * Dry-run is the default:
 *   pnpm payload run scripts/retire-solutions.ts
 *
 * Apply only after reviewing the output:
 *   pnpm payload run scripts/retire-solutions.ts apply
 *
 * Applying moves only the explicitly listed records to draft, closes both
 * locale publishing gates, and creates permanent redirects for the three true
 * consolidations. It never deletes a solution document.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { SOLUTIONS } from './data/solutions-curated'
import { RETIRED_SOLUTIONS } from './data/solutions-retired'

const apply = process.argv.includes('--apply') || process.argv.includes('apply')
const payload = await getPayload({ config })

const targetBySlug = new Map(SOLUTIONS.map((solution) => [solution.slug, solution]))

async function retireLocale(id, locale) {
  const current = await payload.findByID({
    collection: 'solutions',
    id,
    locale,
    fallbackLocale: false,
    draft: true,
    depth: 0,
  })

  await payload.update({
    collection: 'solutions',
    id,
    locale,
    data: {
      _status: 'draft',
      seoWorkflowVersion: 1,
      localeReady: false,
      seo: {
        ...(current.seo ?? {}),
        indexable: false,
      },
    },
  })
}

async function upsertRedirect(fromPath, toPath, note) {
  const existing = await payload.find({
    collection: 'redirects',
    where: { fromPath: { equals: fromPath } },
    draft: true,
    depth: 0,
    limit: 1,
  })
  const data = {
    fromPath,
    toPath,
    statusCode: '308',
    preserveQuery: true,
    active: true,
    note,
    _status: 'published',
  }

  if (existing.docs[0]) {
    await payload.update({
      collection: 'redirects',
      id: existing.docs[0].id,
      data,
    })
  } else {
    await payload.create({ collection: 'redirects', data })
  }
}

for (const retired of RETIRED_SOLUTIONS) {
  const match = await payload.find({
    collection: 'solutions',
    locale: 'sr',
    fallbackLocale: false,
    where: { slug: { equals: retired.srSlug } },
    draft: true,
    depth: 0,
    limit: 1,
  })
  const id = match.docs[0]?.id

  if (!id) {
    console.log(`skip         ${retired.slug} (document not found)`)
    continue
  }

  console.log(`${apply ? 'retire' : 'would retire'} ${retired.slug}`)
  if (apply) {
    await retireLocale(id, 'sr')
    await retireLocale(id, 'en')
  }

  if (!retired.redirectTo) continue
  const target = targetBySlug.get(retired.redirectTo)
  if (!target) throw new Error(`unknown retirement redirect target: ${retired.redirectTo}`)

  const redirects = [
    {
      fromPath: `/solutions/${retired.slug}`,
      toPath: `/solutions/${target.slug}`,
    },
    {
      fromPath: `/sr/resenja/${retired.srSlug}`,
      toPath: `/sr/resenja/${target.srSlug}`,
    },
  ]

  for (const redirect of redirects) {
    console.log(
      `${apply ? 'redirect' : 'would redirect'} ${redirect.fromPath} -> ${redirect.toPath}`,
    )
    if (apply) {
      await upsertRedirect(
        redirect.fromPath,
        redirect.toPath,
        `Consolidated retired ${retired.slug} solution into ${target.slug}.`,
      )
    }
  }
}

console.log(
  apply
    ? '\nRetirement applied without deleting documents.'
    : '\nDry run only. Re-run with "apply" after review and a database backup.',
)
process.exit(0)
