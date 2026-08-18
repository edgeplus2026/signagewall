// @ts-nocheck
/**
 * What flipping `SEO_STRICT_CONTENT_GATES` would actually do.
 *
 * The two gates are per-language (`localeReady` and `seo.indexable` are both
 * localized), and lenient mode treats a missing value as a yes while strict
 * mode treats it as a no. A record seeded before the workflow existed can
 * therefore be live today and disappear the moment the flag is set — which is
 * the one thing the backfill cannot tell you, because it skips every record
 * whose intent an editor already owns.
 *
 * Read-only. Run it before the flip to see the damage, and after to confirm
 * the surviving set is the one you meant to keep.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'

const LOCALES = ['en', 'sr']
const COLLECTIONS = ['posts', 'solutions', 'app-pages']

const payload = await getPayload({ config })

/** Mirrors `contentRecordMayBeIndexed` in `src/lib/payload.ts`, both modes. */
function mayBeIndexed(doc, strict) {
  return strict
    ? doc.localeReady === true && doc.seo?.indexable === true
    : doc.localeReady !== false && doc.seo?.indexable !== false
}

/** Mirrors `contentRecordIsApproved`: a canonical override also withdraws it. */
function isApproved(doc, strict) {
  return mayBeIndexed(doc, strict) && !doc.seo?.canonicalOverride?.trim()
}

function label(doc) {
  return doc.slug ?? doc.appKey ?? doc.id
}

let wouldDrop = 0

for (const collection of COLLECTIONS) {
  console.log(`\n=== ${collection} ===`)

  for (const locale of LOCALES) {
    const { docs } = await payload.find({
      collection,
      locale,
      fallbackLocale: false,
      limit: 500,
      depth: 0,
      where: { _status: { equals: 'published' } },
    })

    const lenient = docs.filter((d) => isApproved(d, false))
    const strict = docs.filter((d) => isApproved(d, true))
    const dropped = lenient.filter((d) => !strict.includes(d))
    wouldDrop += dropped.length

    console.log(
      `  [${locale}] published=${docs.length} live-now=${lenient.length} ` +
        `live-after-flip=${strict.length} would-drop=${dropped.length}`,
    )

    for (const d of dropped) {
      const ready = d.localeReady === undefined ? 'unset' : String(d.localeReady)
      const index = d.seo?.indexable === undefined ? 'unset' : String(d.seo.indexable)
      console.log(`      DROP ${String(label(d)).padEnd(42)} localeReady=${ready} indexable=${index}`)
    }
  }
}

console.log(
  wouldDrop === 0
    ? '\nNo published locale version loses its public URL. The flip is safe.'
    : `\n${wouldDrop} published locale version(s) would be withdrawn from the public site.`,
)
process.exit(0)
