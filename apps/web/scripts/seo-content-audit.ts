// @ts-nocheck
/**
 * Reports editorial metadata outside the length a search result can use:
 * App Page descriptions too short to say anything, and post titles that get
 * truncated once the brand suffix is appended.
 *
 * Read-only. The companion fixer is `seo-content-fix.ts`.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'

const LOCALES = ['en', 'sr']
const payload = await getPayload({ config })

console.log('=== APP PAGES: seo.metaDescription under 70 chars ===')
for (const locale of LOCALES) {
  const { docs } = await payload.find({
    collection: 'app-pages',
    locale,
    fallbackLocale: false,
    limit: 200,
    depth: 0,
    where: { _status: { equals: 'published' } },
  })
  for (const d of docs) {
    const v = d.seo?.metaDescription ?? ''
    if (v.length < 70) {
      console.log(`  [${locale}] ${String(d.appKey).padEnd(12)} len=${v.length} :: ${v}`)
    }
  }
}

console.log('\n=== POSTS: effective <title> over 60 chars incl. " | SignageWall" ===')
for (const locale of LOCALES) {
  const { docs } = await payload.find({
    collection: 'posts',
    locale,
    fallbackLocale: false,
    limit: 200,
    depth: 0,
    where: { _status: { equals: 'published' } },
  })
  for (const d of docs) {
    const eff = d.seo?.metaTitle ?? d.metaTitle ?? d.title
    const full = `${eff} | SignageWall`.length
    if (full > 60) {
      console.log(`  [${locale}] full=${full} slug=${d.slug}`)
      console.log(`        seo.metaTitle = ${JSON.stringify(d.seo?.metaTitle)}`)
      console.log(`        metaTitle     = ${JSON.stringify(d.metaTitle)}`)
      console.log(`        title         = ${JSON.stringify(d.title)}`)
    }
  }
}
