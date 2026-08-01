// @ts-nocheck
/**
 * Fills the editorial fields on existing App Page drafts and publishes them.
 *
 * `seed-app-pages.ts` creates the records; this writes the copy that makes them
 * worth indexing. The two are separate because the first is derived from the
 * code registry and can be re-run safely, while this one carries prose that
 * must not be regenerated over an editor's changes.
 *
 * Only the apps present in `APP_COPY` are touched, so this runs in batches: an
 * app already written stays as it is when a later batch runs.
 *
 * Publishing is the point — `localeReady` and `seo.indexable` are set for both
 * languages, which is what puts the page into the sitemap and drops its
 * `noindex`. Nothing else in the collection is written.
 *
 *   pnpm payload run scripts/seed-app-copy.ts
 *   pnpm payload run scripts/seed-app-copy.ts dry
 */
import { getPayload } from 'payload'

import { APP_COPY } from './data/app-copy'
import config from '../src/payload.config'

const DRY = process.argv.includes('dry')
const payload = await getPayload({ config })

/** Both languages of one array/group field, written in a single update. */
const localized = (sr, en) => ({ sr, en })

let updated = 0
let missing = 0

for (const [appKey, copy] of Object.entries(APP_COPY)) {
  const { docs } = await payload.find({
    collection: 'app-pages',
    where: { appKey: { equals: appKey } },
    limit: 1,
    depth: 0,
  })

  const existing = docs[0]
  if (!existing) {
    console.log(`  MISSING  ${appKey} — run seed-app-pages.ts first`)
    missing += 1
    continue
  }

  if (DRY) {
    console.log(`  would write  ${appKey}`)
    continue
  }

  /* One update per locale: Payload writes localised fields for the locale it is
     given, so a single call would leave the other language empty. */
  for (const locale of ['sr', 'en']) {
    const c = copy[locale]
    await payload.update({
      collection: 'app-pages',
      id: existing.id,
      locale,
      draft: false,
      data: {
        heroTitle: c.heroTitle,
        summary: c.summary,
        /* The gate refuses to index a page whose search intent is undeclared,
           and checks the primary query against every other post, solution and
           app page — so this has to be written per app, per language. */
        intent: c.intent,
        benefits: c.benefits.map((text) => ({ text })),
        features: c.features,
        useCases: c.useCases,
        setupSteps: c.setupSteps,
        requirements: c.requirements,
        faq: c.faq,
        localeReady: true,
        seo: { indexable: true },
        _status: 'published',
      },
    })
  }

  console.log(`  ok       ${appKey}`)
  updated += 1
}

console.log(
  `\n${DRY ? 'Dry run. ' : ''}${updated} app page(s) written and published` +
    (missing ? `, ${missing} missing` : '') +
    '.',
)

process.exit(0)
