// @ts-nocheck
/**
 * Resolve repository link briefs into Payload relationships.
 *
 * Run after app-page, post and solution seeds. The command is idempotent and
 * only updates explicit related-content fields; it does not infer links from
 * shared keywords.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { POSTS } from './data/posts'
import { POSTS_FULL } from './data/posts-full'
import { SOLUTIONS } from './data/solutions-curated'

const payload = await getPayload({ config })

const [postResult, solutionResult, appPageResult] = await Promise.all([
  payload.find({
    collection: 'posts',
    locale: 'sr',
    fallbackLocale: false,
    draft: true,
    depth: 0,
    limit: 1000,
  }),
  payload.find({
    collection: 'solutions',
    locale: 'sr',
    fallbackLocale: false,
    draft: true,
    depth: 0,
    limit: 1000,
  }),
  payload.find({
    collection: 'app-pages',
    locale: 'sr',
    fallbackLocale: false,
    draft: true,
    depth: 0,
    limit: 1000,
  }),
])

const postBySlug = new Map(postResult.docs.map((doc) => [doc.slug, doc]))
const solutionBySlug = new Map(
  SOLUTIONS.flatMap((source) => {
    const doc = solutionResult.docs.find((candidate) => candidate.slug === source.srSlug)
    return doc ? [[source.slug, doc]] : []
  }),
)
const appPageByKey = new Map(appPageResult.docs.map((doc) => [doc.appKey, doc]))

function requireDocument(map, key, label) {
  const document = map.get(key)
  if (!document) {
    throw new Error(
      `cannot link ${label} "${key}"; run the matching seed before seed-content-links.ts`,
    )
  }
  return document
}

function relationships(links, self) {
  const relatedPosts = links.posts.map((slug) => requireDocument(postBySlug, slug, 'post').id)
  const relatedSolutions = links.solutions.map(
    (slug) => requireDocument(solutionBySlug, slug, 'solution').id,
  )
  const relatedApps = links.apps.map((key) => requireDocument(appPageByKey, key, 'app page').id)

  if (self.postId && relatedPosts.includes(self.postId)) {
    throw new Error(`post "${self.label}" links to itself`)
  }
  if (self.solutionId && relatedSolutions.includes(self.solutionId)) {
    throw new Error(`solution "${self.label}" links to itself`)
  }

  return { relatedPosts, relatedSolutions, relatedApps }
}

for (const source of POSTS) {
  const document = requireDocument(postBySlug, source.slug, 'post')
  const editorial = POSTS_FULL[source.slug]
  if (!editorial?.links) throw new Error(`post "${source.slug}" has no explicit link brief`)
  const current = await payload.findByID({
    collection: 'posts',
    id: document.id,
    locale: 'sr',
    fallbackLocale: false,
    draft: true,
    depth: 0,
  })

  await payload.update({
    collection: 'posts',
    id: document.id,
    locale: 'sr',
    data: {
      ...relationships(editorial.links, { postId: document.id, label: source.slug }),
      seoWorkflowVersion: 1,
      localeReady: current.localeReady,
      seo: current.seo,
    },
  })
  console.log(`linked post     ${source.slug}`)
}

for (const source of SOLUTIONS) {
  const document = requireDocument(solutionBySlug, source.slug, 'solution')
  const current = await payload.findByID({
    collection: 'solutions',
    id: document.id,
    locale: 'sr',
    fallbackLocale: false,
    draft: true,
    depth: 0,
  })

  await payload.update({
    collection: 'solutions',
    id: document.id,
    locale: 'sr',
    data: {
      ...relationships(source.links, { solutionId: document.id, label: source.slug }),
      seoWorkflowVersion: 1,
      localeReady: current.localeReady,
      seo: current.seo,
    },
  })
  console.log(`linked solution ${source.slug}`)
}

console.log(
  `\nLinked ${POSTS.length.toString()} posts and ${SOLUTIONS.length.toString()} solutions.`,
)
process.exit(0)
