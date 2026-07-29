// @ts-nocheck
/* Seed the `solutions` collection with 20 bilingual industry pages.
   Run with env loaded:  pnpm payload run scripts/seed-solutions.ts

   Idempotent: matches on slug and updates in place, so re-running after a copy
   edit refreshes content instead of duplicating it.

   NOTE: `payload run` fire-and-forgets the script's promise — everything below
   is top-level await on purpose. Wrapping it in `main().catch()` exits 0 before
   the async work runs, and the seed silently does nothing. */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { SOLUTIONS } from './data/solutions'
import { SOLUTIONS_DEEP } from './data/solutions-deep'

const payload = await getPayload({ config })

let created = 0
let updated = 0

for (const entry of SOLUTIONS) {
  const { slug, srSlug, icon, order, sr, en } = entry
  /* The expansion content, when this industry has been written. Scenarios and
     FAQ are appended to the short set rather than replacing it — the originals
     are good, they were just too few. */
  const deep = SOLUTIONS_DEEP[slug]
  const merge = (base, extra, locale) => ({
    intro: deep?.[locale]?.intro ?? '',
    scenarios: [...base.scenarios, ...(deep?.[locale]?.scenarios ?? [])],
    faq: deep?.[locale]?.faq ?? base.faq,
    proof: deep?.[locale]?.proof ?? undefined,
  })
  const srDeep = merge(sr, deep, 'sr')
  const enDeep = merge(en, deep, 'en')

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
    intro: srDeep.intro,
    scenarios: srDeep.scenarios,
    proof: srDeep.proof,
    recommendedApps: deep?.recommendedApps ?? '',
    benefits: sr.benefits.map((text) => ({ text })),
    faq: srDeep.faq,
    _status: 'published',
  }

  const enData = {
    slug,
    name: en.name,
    tagline: en.tagline,
    title: en.title,
    subtitle: en.subtitle,
    metaTitle: en.metaTitle,
    metaDescription: en.metaDescription,
    intro: enDeep.intro,
    scenarios: enDeep.scenarios,
    proof: enDeep.proof,
    benefits: en.benefits.map((text) => ({ text })),
    faq: enDeep.faq,
    _status: 'published',
  }

  /* Match on the Serbian slug: `find` without an explicit locale queries the
     default one, which is `sr`, so searching for the English slug never
     matches an existing row and the unique index then rejects the create. */
  const existing = await payload.find({
    collection: 'solutions',
    where: { slug: { equals: srSlug } },
    limit: 1,
    depth: 0,
  })

  let id = existing.docs[0]?.id
  const existed = Boolean(id)

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
