/* One-off: convert `slug` from a plain string to a localised { sr, en } pair on
   posts and solutions, in both the live documents and their version history.
   Run with:  mongosh "$DATABASE_URI" --file scripts/migrate-localized-slugs.mjs

   Idempotent — a slug that is already an object is left alone, so a second run
   is a no-op. Existing slugs are always kept as one side of the pair, so no URL
   that worked before this ran stops resolving in its own language.

   Serbian slugs are written without diacritics (č→c, đ→dj) because that is what
   people type and what search engines show back cleanly. */

// Serbian post slugs already exist; these are their English counterparts.
// Keyword-first rather than a literal title transliteration.
const POST_EN = {
  'digitalni-meni-povecava-prodaju': 'digital-menu-increases-sales',
  'digital-signage-za-pocetnike': 'digital-signage-for-beginners',
  'koliko-kosta-digital-signage': 'digital-signage-cost',
  'android-boks-ili-mini-pc': 'android-box-or-mini-pc',
  'ekran-mora-da-radi-i-bez-interneta': 'screens-that-work-offline',
  'raspored-sadrzaja-koji-se-sam-menja': 'content-schedule-that-runs-itself',
  'vertikalni-ili-horizontalni-ekran': 'portrait-or-landscape-screen',
  'greske-na-digitalnim-ekranima': 'digital-signage-mistakes',
  'koliko-dugo-treba-da-traje-slajd': 'how-long-should-a-slide-last',
  'kako-meriti-da-li-ekran-radi-posao': 'measuring-digital-signage-results',
  'ekrani-u-maloprodaji-od-izloga-do-kase': 'digital-screens-in-retail',
  'sta-prikazati-u-cekaonici': 'what-to-show-in-a-waiting-room',
  'google-sheets-na-ekranu': 'google-sheets-on-a-screen',
  'interna-komunikacija-ekran-umesto-mejla': 'internal-comms-screens',
  'ekran-u-izlogu-citljivost': 'window-screen-readability',
  'zaglavljena-slika-burn-in': 'prevent-screen-burn-in',
  'tipografija-za-ekrane': 'typography-for-screens',
  'vise-lokacija-jedan-tim': 'managing-a-screen-network',
  'video-na-ekranima': 'video-on-digital-signage',
  'sta-pitati-dobavljaca': 'questions-to-ask-a-signage-supplier',
}

// Solution slugs were English; these are the Serbian counterparts.
const SOLUTION_SR = {
  automotive: 'auto-industrija',
  bakeries: 'pekare',
  banking: 'banke-i-finansije',
  cinema: 'bioskopi-i-zabava',
  coworking: 'koworking',
  education: 'obrazovanje',
  events: 'dogadjaji-i-sale',
  gyms: 'teretane',
  healthcare: 'zdravstvo',
  hospitality: 'ugostiteljstvo',
  hotels: 'hoteli',
  manufacturing: 'proizvodnja',
  office: 'kancelarije',
  pharmacy: 'apoteke',
  'real-estate': 'nekretnine',
  retail: 'maloprodaja',
  salons: 'saloni-lepote',
  supermarkets: 'supermarketi',
  transport: 'saobracaj-i-terminali',
  veterinary: 'veterina',
}

/** `existingLocale` is the language the current string slug is written in. */
function pairFor(current, map, existingLocale) {
  const other = map[current]
  if (!other) return null
  return existingLocale === 'sr' ? { sr: current, en: other } : { sr: other, en: current }
}

function migrate(collName, versionsName, map, existingLocale) {
  const coll = db.getCollection(collName)
  const versions = db.getCollection(versionsName)
  let done = 0
  let skipped = 0
  const unmapped = []

  coll.find({}).forEach((doc) => {
    if (typeof doc.slug !== 'string') {
      skipped++
      return
    }
    const pair = pairFor(doc.slug, map, existingLocale)
    if (!pair) {
      unmapped.push(doc.slug)
      return
    }
    coll.updateOne({ _id: doc._id }, { $set: { slug: pair } })
    // Version history has to move with it, or restoring a draft would write a
    // string slug back over the localised one.
    versions.updateMany(
      { parent: doc._id, 'version.slug': { $type: 'string' } },
      { $set: { 'version.slug': pair } },
    )
    done++
  })

  print(`${collName}: ${done} migrated, ${skipped} already localised`)
  if (unmapped.length) print(`  !! NO MAPPING for: ${unmapped.join(', ')}`)
  return unmapped.length === 0
}

/* The old single-field unique index would now sit on an object. Payload builds
   slug.sr / slug.en indexes on boot; this drops the one it replaces. */
function dropStaleIndex(collName, indexName) {
  const coll = db.getCollection(collName)
  if (coll.getIndexes().some((i) => i.name === indexName)) {
    coll.dropIndex(indexName)
    print(`${collName}: dropped stale index ${indexName}`)
  }
}

const okPosts = migrate('posts', '_posts_versions', POST_EN, 'sr')
const okSolutions = migrate('solutions', '_solutions_versions', SOLUTION_SR, 'en')

if (okPosts && okSolutions) {
  dropStaleIndex('posts', 'slug_1')
  dropStaleIndex('solutions', 'slug_1')
  dropStaleIndex('_posts_versions', 'version.slug_1')
  dropStaleIndex('_solutions_versions', 'version.slug_1')
  print('\nDone.')
} else {
  print('\nStale indexes left in place — fix the unmapped slugs and re-run.')
}
