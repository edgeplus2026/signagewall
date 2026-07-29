// @ts-nocheck
/* Seed the blog with an admin user, categories and a few bilingual posts.
   Run with env loaded:  pnpm payload run scripts/seed.ts  */
import { getPayload } from 'payload'

import config from '../src/payload.config'

// --- minimal lexical helpers ------------------------------------------------
const text = (t) => ({ type: 'text', text: t, detail: 0, format: 0, mode: 'normal', style: '', version: 1 })
const para = (t) => ({ type: 'paragraph', children: [text(t)], direction: 'ltr', format: '', indent: 0, version: 1, textFormat: 0, textStyle: '' })
const head = (t, tag = 'h2') => ({ type: 'heading', tag, children: [text(t)], direction: 'ltr', format: '', indent: 0, version: 1 })
const doc = (nodes) => ({ root: { type: 'root', children: nodes, direction: 'ltr', format: '', indent: 0, version: 1 } })

const CATEGORIES = [
  { slug: 'vodici', sr: 'Vodiči', en: 'Guides' },
  { slug: 'saveti', sr: 'Saveti', en: 'Tips' },
]

const POSTS = [
  {
    slug: 'digitalni-meni-povecava-prodaju',
    category: 'saveti',
    publishedAt: '2026-07-22T09:00:00.000Z',
    sr: {
      title: 'Kako digitalni meni povećava prodaju',
      excerpt: 'Digitalni meni nije samo lepši od štampanog — pravilno postavljen, on direktno utiče na to šta gosti naručuju.',
      content: doc([
        para('Štampani meni je statičan: jednom kad ode u štampu, tu je nedeljama. Digitalni meni menjate za nekoliko sekundi — i baš ta fleksibilnost donosi više prodaje.'),
        head('Istaknite ono što nosi maržu'),
        para('Rotirajte preporuke i specijalitete u udarnim terminima. Kada je jelo vizuelno istaknuto, gosti ga češće biraju.'),
        head('Menjajte ponudu u realnom vremenu'),
        para('Doručak ujutru, ručak u podne, koktel meni uveče — sve na istom ekranu, zakazano unapred. Bez ponovne štampe i bez nalepnica preko cena.'),
      ]),
    },
    en: {
      title: 'How a digital menu boosts sales',
      excerpt: "A digital menu isn't just nicer than print — set up well, it directly shapes what guests order.",
      content: doc([
        para('A printed menu is static: once it goes to print, it stays for weeks. A digital menu changes in seconds — and that flexibility is exactly what drives more sales.'),
        head('Highlight what carries the margin'),
        para('Rotate recommendations and specials during peak hours. When a dish is visually featured, guests choose it more often.'),
        head('Change the offer in real time'),
        para('Breakfast in the morning, lunch at noon, a cocktail menu in the evening — all on the same screen, scheduled ahead. No reprinting and no stickers over prices.'),
      ]),
    },
  },
  {
    slug: 'signage-za-pocetnike',
    category: 'vodici',
    publishedAt: '2026-07-18T09:00:00.000Z',
    sr: {
      title: 'Digital signage za početnike: šta vam zaista treba',
      excerpt: 'Mislite da je za digitalne ekrane potrebna skupa oprema i tehničar? Evo koliko je zapravo jednostavno.',
      content: doc([
        para('Digital signage zvuči komplikovano, ali za početak vam treba samo troje: ekran, mali uređaj i softver.'),
        head('Ekran koji već imate'),
        para('Bilo koji TV ili monitor je dovoljan. Ne morate da kupujete posebne „signage" ekrane da biste počeli.'),
        head('Plejer i softver'),
        para('Mali Android boks ili računar pokreće SignageWall plejer. Vi upravljate sadržajem iz pregledne kontrolne table — kao što biste objavili nešto na društvenoj mreži.'),
      ]),
    },
    en: {
      title: 'Digital signage for beginners: what you really need',
      excerpt: 'Think digital screens require expensive gear and a technician? Here is how simple it actually is.',
      content: doc([
        para('Digital signage sounds complicated, but to get started you only need three things: a screen, a small device and software.'),
        head('A screen you already have'),
        para("Any TV or monitor will do. You don't need to buy special \"signage\" displays to begin."),
        head('A player and software'),
        para('A small Android box or computer runs the SignageWall player. You manage content from a clear dashboard — as easily as posting to social media.'),
      ]),
    },
  },
  {
    slug: 'ekrani-koji-rade-offline',
    category: 'saveti',
    publishedAt: '2026-07-14T09:00:00.000Z',
    sr: {
      title: 'Zašto vaši ekrani treba da rade i offline',
      excerpt: 'Internet zna da padne. Ekran koji se tada zamrzne gori je od praznog — evo zašto je offline rad ključan.',
      content: doc([
        para('Zamislite prazan ili zamrznut ekran u punom restoranu baš u špicu. Loš internet ne bi smeo da bude razlog za to.'),
        head('Sadržaj koji se kešira'),
        para('SignageWall plejer čuva sadržaj lokalno i nastavlja da ga prikazuje i kada veza padne. Gosti ni ne primete prekid.'),
        head('Sinhronizacija kad se veza vrati'),
        para('Čim se internet vrati, plejer automatski povuče najnovije izmene. Vi ne radite ništa — sve se dešava u pozadini.'),
      ]),
    },
    en: {
      title: 'Why your screens should work offline too',
      excerpt: 'The internet drops. A screen that freezes then is worse than a blank one — here is why offline matters.',
      content: doc([
        para('Picture a blank or frozen screen in a full restaurant right at peak time. A flaky connection should never be the reason.'),
        head('Content that is cached'),
        para('The SignageWall player stores content locally and keeps showing it even when the connection drops. Guests never notice the outage.'),
        head('Syncing when the connection returns'),
        para('The moment the internet is back, the player pulls the latest changes automatically. You do nothing — it all happens in the background.'),
      ]),
    },
  },
]

const payload = await getPayload({ config })
{

  // Admin user
  let admin = (await payload.find({ collection: 'users', limit: 1 })).docs[0]
  if (!admin) {
    admin = await payload.create({
      collection: 'users',
      data: { email: 'admin@signagewall.local', password: 'changeme123', name: 'SignageWall tim' },
    })
    payload.logger.info('Created admin user admin@signagewall.local / changeme123')
  }

  // Categories (localized title, single slug)
  const catId = {}
  for (const c of CATEGORIES) {
    let existing = (await payload.find({ collection: 'categories', where: { slug: { equals: c.slug } }, limit: 1 })).docs[0]
    if (!existing) {
      existing = await payload.create({ collection: 'categories', locale: 'sr', data: { title: c.sr, slug: c.slug } })
      await payload.update({ collection: 'categories', id: existing.id, locale: 'en', data: { title: c.en } })
    }
    catId[c.slug] = existing.id
  }

  // Posts
  for (const p of POSTS) {
    const existing = (await payload.find({ collection: 'posts', where: { slug: { equals: p.slug } }, limit: 1 })).docs[0]
    if (existing) continue
    const created = await payload.create({
      collection: 'posts',
      locale: 'sr',
      data: {
        slug: p.slug,
        title: p.sr.title,
        excerpt: p.sr.excerpt,
        content: p.sr.content,
        category: catId[p.category],
        author: admin.id,
        publishedAt: p.publishedAt,
        _status: 'published',
      },
    })
    await payload.update({
      collection: 'posts',
      id: created.id,
      locale: 'en',
      data: { title: p.en.title, excerpt: p.en.excerpt, content: p.en.content, _status: 'published' },
    })
    payload.logger.info(`Seeded post: ${p.slug}`)
  }

  payload.logger.info('Seed complete.')
  process.exit(0)
}
