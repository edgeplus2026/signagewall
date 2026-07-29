// @ts-nocheck
/* One-off: drop the generated SVG artwork and the posts that reference it, so
   the next seed run rebuilds both against real photography.
   Run with:  pnpm payload run scripts/purge-generated-art.ts */
import { getPayload } from 'payload'

import config from '../src/payload.config'

const payload = await getPayload({ config })

const posts = await payload.delete({ collection: 'posts', where: { slug: { exists: true } } })
console.log(`posts deleted: ${String(posts.docs.length)}`)

const media = await payload.find({ collection: 'media', limit: 500, depth: 0 })
const svgs = media.docs.filter((d) => d.filename?.endsWith('.svg'))
for (const doc of svgs) await payload.delete({ collection: 'media', id: doc.id })
console.log(`generated SVGs deleted: ${String(svgs.length)}`)

process.exit(0)
