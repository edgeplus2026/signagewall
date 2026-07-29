// @ts-nocheck
/* Seed the blog: categories, stock photography and 20 bilingual posts.
   Run with env loaded:  pnpm payload run scripts/seed-posts.ts

   Idempotent on slug. Cover and figure photography comes from Pexels (see
   scripts/data/post-images.ts for the per-image search terms) and is downloaded
   and re-uploaded into our own Media collection rather than hot-linked, so
   article images don't depend on somebody else's CDN staying put.

   NOTE: `payload run` fire-and-forgets the script's promise — this file is
   top-level await on purpose. */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { POST_IMAGES } from './data/post-images'
import { CATEGORIES, POSTS } from './data/posts'
import { POSTS_DEEP } from './data/posts-deep'
import { downloadPhoto, findPhoto } from './lib/pexels'

const payload = await getPayload({ config })
const workDir = mkdtempSync(join(tmpdir(), 'signagewall-covers-'))

// --- lexical helpers --------------------------------------------------------
const text = (t) => ({
  type: 'text',
  text: t,
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  version: 1,
})
const para = (t) => ({
  type: 'paragraph',
  children: [text(t)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
  textFormat: 0,
  textStyle: '',
})
const head = (t, tag = 'h2') => ({
  type: 'heading',
  tag,
  children: [text(t)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})
const listItem = (t, i) => ({
  type: 'listitem',
  value: i + 1,
  checked: undefined,
  children: [text(t)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})
const list = (items, ordered) => ({
  type: 'list',
  listType: ordered ? 'number' : 'bullet',
  tag: ordered ? 'ol' : 'ul',
  start: 1,
  children: items.map(listItem),
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})
const quote = (t) => ({
  type: 'quote',
  children: [text(t)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})
const upload = (id) => ({
  type: 'upload',
  relationTo: 'media',
  value: id,
  format: '',
  version: 3,
})
const doc = (nodes) => ({
  root: { type: 'root', children: nodes, direction: 'ltr', format: '', indent: 0, version: 1 },
})

/** Turns the compact block tuples in data/posts.ts into a lexical document. */
function toLexical(blocks, figureIds) {
  return doc(
    blocks.map((b) => {
      const [kind, value] = b
      if (kind === 'h') return head(value)
      if (kind === 'h3') return head(value, 'h3')
      if (kind === 'ul') return list(value, false)
      if (kind === 'ol') return list(value, true)
      if (kind === 'quote') return quote(value)
      if (kind === 'fig') return upload(figureIds[value])
      return para(value)
    }),
  )
}

async function upsertPhoto(filename, spec, locale = 'sr') {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs[0]) return existing.docs[0].id

  const photo = await findPhoto(spec.query)
  if (!photo) {
    // Loud rather than silent: a post with no image is a content problem the
    // seed can't solve, and a fallback would hide which query needs rewriting.
    throw new Error(`no Pexels result for "${spec.query}" (${filename})`)
  }

  const buffer = await downloadPhoto(photo.url)
  const filePath = join(workDir, filename)
  writeFileSync(filePath, buffer)

  const doc = await payload.create({
    collection: 'media',
    filePath,
    data: {
      alt: spec.alt.sr,
      ...(spec.caption ? { caption: spec.caption.sr } : {}),
      credit: photo.credit,
      creditUrl: photo.creditUrl,
      sourceUrl: photo.sourceUrl,
    },
    locale: 'sr',
  })

  // English alt/caption on the same record.
  await payload.update({
    collection: 'media',
    id: doc.id,
    data: {
      alt: spec.alt.en,
      ...(spec.caption ? { caption: spec.caption.en } : {}),
    },
    locale: 'en',
  })

  console.log(`    photo  ${filename.padEnd(46)} ${photo.credit}`)
  return doc.id
}

// --- categories -------------------------------------------------------------
const categoryIds = {}
for (const c of CATEGORIES) {
  const existing = await payload.find({
    collection: 'categories',
    where: { slug: { equals: c.slug } },
    limit: 1,
    depth: 0,
  })
  let id = existing.docs[0]?.id
  if (id) {
    await payload.update({ collection: 'categories', id, data: { title: c.sr }, locale: 'sr' })
  } else {
    const doc = await payload.create({
      collection: 'categories',
      data: { slug: c.slug, title: c.sr },
      locale: 'sr',
    })
    id = doc.id
  }
  await payload.update({ collection: 'categories', id, data: { title: c.en }, locale: 'en' })
  categoryIds[c.slug] = id
}
console.log(`categories: ${CATEGORIES.length} ready`)

// --- author -----------------------------------------------------------------
const users = await payload.find({ collection: 'users', limit: 1, depth: 0 })
const authorId = users.docs[0]?.id

// --- posts ------------------------------------------------------------------
let created = 0
let updated = 0

for (const post of POSTS) {
  const images = POST_IMAGES[post.slug]
  if (!images) throw new Error(`no image manifest for ${post.slug}`)

  const coverId = await upsertPhoto(`${post.slug}-cover.jpg`, images.cover)

  const figureIds = []
  for (const [i, figure] of (images.figures ?? []).entries()) {
    figureIds.push(await upsertPhoto(`${post.slug}-fig-${String(i + 1)}.jpg`, figure))
  }

  const base = {
    slug: post.slug,
    coverImage: coverId,
    category: categoryIds[post.category],
    publishedAt: post.publishedAt,
    _status: 'published',
    ...(authorId ? { author: authorId } : {}),
  }

  /* `find` without a locale queries the default one, which is English. The
     top-level `post.slug` is the Serbian slug, so this has to say so — or the
     lookup misses every existing row and the create fails on the unique index. */
  const existing = await payload.find({
    collection: 'posts',
    locale: 'sr',
    where: { slug: { equals: post.slug } },
    limit: 1,
    depth: 0,
  })
  let id = existing.docs[0]?.id
  const existed = Boolean(id)

  /* Full-length replacement, where one has been written. Only `content` is
     overridden — title, excerpt and meta stay in the base file so there is one
     place to edit them. */
  const deep = POSTS_DEEP[post.slug]

  const srData = {
    ...base,
    title: post.sr.title,
    metaTitle: post.sr.metaTitle,
    metaDescription: post.sr.metaDescription,
    excerpt: post.sr.excerpt,
    content: toLexical(deep?.sr?.content ?? post.sr.content, figureIds),
  }
  const enData = {
    /* The English slug has to be written explicitly. `slug` is localised with
       fallback, so omitting it here does not leave the field empty — it serves
       the Serbian slug on the English URL, and every English post ends up at
       /en/blog/<serbian-slug>. That was only fixed by a one-off migration; a
       fresh seed would have reintroduced it. */
    slug: post.en.slug,
    title: post.en.title,
    metaTitle: post.en.metaTitle,
    metaDescription: post.en.metaDescription,
    excerpt: post.en.excerpt,
    content: toLexical(deep?.en?.content ?? post.en.content, figureIds),
    _status: 'published',
  }

  if (id) {
    await payload.update({ collection: 'posts', id, data: srData, locale: 'sr' })
    updated++
  } else {
    const doc = await payload.create({ collection: 'posts', data: srData, locale: 'sr' })
    id = doc.id
    created++
  }
  await payload.update({ collection: 'posts', id, data: enData, locale: 'en' })
  console.log(`  ${post.slug.padEnd(42)} ${existed ? 'updated' : 'created'}`)
}

console.log(`\nposts: ${created} created, ${updated} updated (${POSTS.length} total)`)
process.exit(0)
