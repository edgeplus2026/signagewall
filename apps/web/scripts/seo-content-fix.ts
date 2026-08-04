// @ts-nocheck
/**
 * Brings editorial metadata inside the length a search result actually renders.
 *
 * Two problems, both found by `seo-content-audit.ts`:
 *
 *  - Three App Page descriptions ran 52–60 characters. Google will show ~155,
 *    so those pages spent a third of their snippet and said nothing about what
 *    the app is for or what it costs.
 *  - Ten post titles reached 61–63 characters once the layout's
 *    " | SignageWall" suffix is appended, which is past where the result list
 *    truncates — every one of them lost its last few words to an ellipsis.
 *
 * Rewrites keep the existing voice and the keyword each title was built around;
 * they only cut the words that were being truncated anyway.
 *
 * Dry-run by default. Review the report, then:
 *   pnpm payload run scripts/seo-content-fix.ts -- --apply
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'

const apply = process.argv.includes('--apply') || process.argv.includes('apply')

/* The brand suffix the locale layout appends to every title but the home page.
   A title is budgeted against the total, because that is what gets truncated. */
const BRAND_SUFFIX = ' | SignageWall'
const TITLE_LIMIT = 60
const DESCRIPTION_MIN = 70
const DESCRIPTION_MAX = 160

/** appKey → locale → new seo.metaDescription */
const APP_DESCRIPTIONS = {
  text: {
    en: 'Put a short message, notice or announcement on your screens and change the text in seconds — no design work and no file to upload.',
    sr: 'Postavite kratku poruku, obaveštenje ili najavu na ekrane i promenite tekst za nekoliko sekundi — bez dizajna i bez fajla za slanje.',
  },
  web: {
    en: 'Show any web page or live dashboard on your screens straight from its URL — an internal report, a status board or a public site, refreshed on its own.',
  },
}

/** slug → locale → new title (the brand suffix is added by the layout) */
const POST_TITLES = {
  'video-on-digital-signage': { en: 'Video on digital signage: format and size' },
  'prevent-screen-burn-in': { en: 'Prevent OLED burn-in on a signage screen' },
  'window-screen-readability': { en: 'How bright should a shop-window screen be?' },
  'digital-screens-in-retail': { en: 'Where to place digital signage in a store' },
  'how-long-should-a-slide-last': { en: 'How long should a signage slide last?' },
  'content-schedule-that-runs-itself': { en: 'How to automate digital signage updates' },
  'sta-pitati-dobavljaca': { sr: '12 pitanja za digital signage dobavljača' },
  'tipografija-za-ekrane': { sr: 'Tipografija za ekrane: pravila koja rade' },
  'raspored-sadrzaja-koji-se-sam-menja': { sr: 'Kako automatizovati sadržaj na ekranu' },
  'digitalni-meni-povecava-prodaju': { sr: 'Digitalni meni koji pomaže prodaji' },
}

const payload = await getPayload({ config })
let changed = 0
let skipped = 0
const problems = []

async function findOne(collection, locale, where) {
  const { docs } = await payload.find({
    collection,
    locale,
    fallbackLocale: false,
    depth: 0,
    limit: 1,
    where: { and: [{ _status: { equals: 'published' } }, where] },
  })
  return docs[0] ?? null
}

/* The `seo` group is localised as a whole, so a partial write would drop the
   sibling fields for that language. Read it back and spread it. */
async function writeSeo(collection, doc, locale, seoPatch, rootPatch, label) {
  if (!apply) return
  try {
    await payload.update({
      collection,
      id: doc.id,
      locale,
      // Drafts are enabled on both collections; without this the edit lands as
      // an unpublished version and the live page never changes.
      data: {
        ...rootPatch,
        seo: { ...(doc.seo ?? {}), ...seoPatch },
        _status: 'published',
      },
    })
  } catch (error) {
    problems.push(`${label}: ${error.message}`)
  }
}

console.log(`=== App Page descriptions === ${apply ? '(APPLY)' : '(dry run)'}\n`)
for (const [appKey, byLocale] of Object.entries(APP_DESCRIPTIONS)) {
  for (const [locale, value] of Object.entries(byLocale)) {
    const label = `app-pages/${appKey} [${locale}]`
    if (value.length < DESCRIPTION_MIN || value.length > DESCRIPTION_MAX) {
      problems.push(`${label}: new description is ${value.length} chars, outside 70–160`)
      continue
    }
    const doc = await findOne('app-pages', locale, { appKey: { equals: appKey } })
    if (!doc) {
      problems.push(`${label}: no published document`)
      continue
    }
    const before = doc.seo?.metaDescription ?? ''
    if (before === value) {
      skipped++
      continue
    }
    console.log(`  ${label}`)
    console.log(`    ${before.length} -> ${value.length}`)
    console.log(`    - ${before}`)
    console.log(`    + ${value}\n`)
    await writeSeo('app-pages', doc, locale, { metaDescription: value }, {}, label)
    changed++
  }
}

console.log(`=== Post titles === ${apply ? '(APPLY)' : '(dry run)'}\n`)
for (const [slug, byLocale] of Object.entries(POST_TITLES)) {
  for (const [locale, value] of Object.entries(byLocale)) {
    const label = `posts/${slug} [${locale}]`
    const full = value.length + BRAND_SUFFIX.length
    if (full > TITLE_LIMIT) {
      problems.push(`${label}: new title is ${full} chars with the brand suffix, over ${TITLE_LIMIT}`)
      continue
    }
    const doc = await findOne('posts', locale, { slug: { equals: slug } })
    if (!doc) {
      problems.push(`${label}: no published document for this slug in this locale`)
      continue
    }
    const before = doc.seo?.metaTitle ?? doc.metaTitle ?? doc.title
    if (before === value) {
      skipped++
      continue
    }
    console.log(`  ${label}`)
    console.log(`    ${before.length + BRAND_SUFFIX.length} -> ${full} chars incl. brand`)
    console.log(`    - ${before}`)
    console.log(`    + ${value}\n`)
    /* `metaTitle` is the legacy field the route still falls back to. Kept in
       step so the two cannot disagree about what this page is called. */
    await writeSeo('posts', doc, locale, { metaTitle: value }, { metaTitle: value }, label)
    changed++
  }
}

console.log(`${apply ? 'Updated' : 'Would update'}: ${changed}   already correct: ${skipped}`)
if (problems.length > 0) {
  console.log('\nPROBLEMS:')
  for (const p of problems) console.log(`  - ${p}`)
}
