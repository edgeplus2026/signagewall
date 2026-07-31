// @ts-nocheck
/**
 * Creates one editorial App Page draft for every technical app manifest that
 * does not already have one. Existing editor-owned records are never changed.
 *
 * The imported catalogue copy is intentionally only a starting point:
 * `localeReady` and `seo.indexable` remain false in both languages. An editor
 * must define a distinct search intent and write substantial, app-specific
 * content before the page is eligible for hreflang or the sitemap.
 *
 * Run with env loaded:
 *   pnpm payload run scripts/seed-app-pages.ts
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { APP_MANIFESTS } from '@signagewall/apps'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const messagesRoot = join(scriptDir, '../src/i18n/messages')
const readCatalog = async (locale) =>
  JSON.parse(await readFile(join(messagesRoot, locale, 'catalog.json'), 'utf8'))

const [srCatalog, enCatalog] = await Promise.all([readCatalog('sr'), readCatalog('en')])
const payload = await getPayload({ config })

let created = 0
let skipped = 0

for (const [order, manifest] of APP_MANIFESTS.entries()) {
  const sr = srCatalog[manifest.slug]
  const en = enCatalog[manifest.slug]
  if (!sr || !en) {
    throw new Error(`Missing bilingual catalogue copy for app "${manifest.slug}".`)
  }

  const existing = await payload.find({
    collection: 'app-pages',
    where: { appKey: { equals: manifest.slug } },
    limit: 1,
    depth: 0,
  })
  const existingId = existing.docs[0]?.id
  if (existingId) {
    skipped++
    continue
  }

  const srData = {
    appKey: manifest.slug,
    order,
    name: manifest.name,
    slug: manifest.slug,
    heroTitle: manifest.name,
    summary: sr.tagline,
    seo: {
      metaTitle: `${manifest.name} za digitalne ekrane`,
      metaDescription: sr.description,
      indexable: false,
    },
    localeReady: false,
    _status: 'draft',
  }
  const enData = {
    name: manifest.name,
    slug: manifest.slug,
    heroTitle: manifest.name,
    summary: en.tagline,
    seo: {
      metaTitle: `${manifest.name} for digital signage`,
      metaDescription: en.description,
      indexable: false,
    },
    localeReady: false,
    _status: 'draft',
  }

  const doc = await payload.create({
    collection: 'app-pages',
    locale: 'sr',
    data: srData,
  })
  const id = doc.id
  created++

  await payload.update({
    collection: 'app-pages',
    id,
    locale: 'en',
    data: enData,
  })
}

payload.logger.info(
  `App Page drafts ready: ${created} created, ${skipped} existing records preserved (${APP_MANIFESTS.length} total).`,
)
process.exit(0)
