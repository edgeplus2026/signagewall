// @ts-nocheck
/* Seed the `solutions` collection with six reviewed bilingual solution pages.
   Run with env loaded:  pnpm payload run scripts/seed-solutions.ts

   Idempotent: matches on slug and updates in place, so re-running after a copy
   edit refreshes content instead of duplicating it.

   The removed industry inventory is retired separately and never deleted; see
   scripts/retire-solutions.ts.

   NOTE: `payload run` fire-and-forgets the script's promise — everything below
   is top-level await on purpose. Wrapping it in `main().catch()` exits 0 before
   the async work runs, and the seed silently does nothing. */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { SOLUTIONS } from './data/solutions-curated'

const payload = await getPayload({ config })
const CONTENT_REVIEWED_AT = '2026-07-30T00:00:00.000Z'

let created = 0
let updated = 0

for (const entry of SOLUTIONS) {
  const { slug, srSlug, icon, order, recommendedApps, sr, en } = entry

  /* Match on the Serbian slug: `find` without an explicit locale queries the
     default one, which is `sr`, so searching for the English slug never
     matches an existing row and the unique index then rejects the create. */
  const existing = await payload.find({
    collection: 'solutions',
    locale: 'sr',
    fallbackLocale: false,
    where: { slug: { equals: srSlug } },
    limit: 1,
    depth: 0,
  })

  let id = existing.docs[0]?.id
  const existed = Boolean(id)

  // Localized fields are written one locale at a time; `sr` is the default so
  // it goes in with the create, and `en` follows as an update.
  const srData = {
    /* The Serbian slug, not the English one. `slug` is localised with fallback,
       so writing the English value here does not leave the field empty — it
       serves /solutions/hospitality on the Serbian site. Same trap as posts. */
    slug: srSlug,
    icon,
    order,
    name: sr.name,
    tagline: sr.tagline,
    title: sr.title,
    subtitle: sr.subtitle,
    metaTitle: sr.metaTitle,
    metaDescription: sr.metaDescription,
    intro: sr.intro,
    scenarios: sr.scenarios,
    proof: sr.proof,
    recommendedApps,
    benefits: sr.benefits.map((text) => ({ text })),
    faq: sr.faq,
    intent: sr.intent,
    seoWorkflowVersion: 1,
    seo: {
      ...(existing.docs[0]?.seo ?? {}),
      metaTitle: sr.metaTitle,
      metaDescription: sr.metaDescription,
      indexable: true,
    },
    localeReady: true,
    lastReviewedAt: CONTENT_REVIEWED_AT,
    _status: 'published',
  }

  const existingEn = id
    ? await payload.findByID({
        collection: 'solutions',
        id,
        locale: 'en',
        fallbackLocale: false,
        depth: 0,
      })
    : null
  const enData = {
    slug,
    name: en.name,
    tagline: en.tagline,
    title: en.title,
    subtitle: en.subtitle,
    metaTitle: en.metaTitle,
    metaDescription: en.metaDescription,
    intro: en.intro,
    scenarios: en.scenarios,
    proof: en.proof,
    recommendedApps,
    benefits: en.benefits.map((text) => ({ text })),
    faq: en.faq,
    intent: en.intent,
    seoWorkflowVersion: 1,
    seo: {
      ...(existingEn?.seo ?? {}),
      metaTitle: en.metaTitle,
      metaDescription: en.metaDescription,
      indexable: true,
    },
    localeReady: true,
    lastReviewedAt: CONTENT_REVIEWED_AT,
    _status: 'published',
  }

  if (id) {
    await payload.update({ collection: 'solutions', id, data: srData, locale: 'sr' })
    updated++
  } else {
    const doc = await payload.create({ collection: 'solutions', data: srData, locale: 'sr' })
    id = doc.id
    created++
  }

  await payload.update({ collection: 'solutions', id, data: enData, locale: 'en' })
  console.log(`  ${slug.padEnd(16)} ${existed ? 'updated' : 'created'}`)
}

console.log(`\nsolutions: ${created} created, ${updated} updated (${SOLUTIONS.length} total)`)
process.exit(0)
