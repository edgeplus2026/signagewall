#!/usr/bin/env node

/**
 * Offline audit for the repository-owned SEO content.
 *
 * The public pages currently draw from seed modules, app manifests and locale
 * JSON. This script reads those files directly; it never imports Payload config
 * and therefore never opens a database connection.
 *
 * Exit codes:
 *   0 — structurally valid (editorial warnings may still be present)
 *   1 — broken references, missing translations or another integrity failure
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = resolve(SCRIPT_DIR, '..')
const REPO_ROOT = resolve(WEB_ROOT, '../..')
const DATA_ROOT = join(SCRIPT_DIR, 'data')
const APPS_SOURCE_ROOT = join(REPO_ROOT, 'packages/apps/src')
const LOCALES = ['en', 'sr']
const EXPECTED_POST_COUNT = 20
const EXPECTED_SOLUTION_COUNT = 6
const EXPECTED_RETIRED_SOLUTION_COUNT = 14
const INTENT_FIELDS = [
  'primaryQuery',
  'intentType',
  'audience',
  'jobToBeDone',
  'uniquePromise',
  'notTargeting',
]
const INTENT_TYPES = new Set([
  'informational',
  'commercial-investigation',
  'transactional',
  'navigational',
])

const findings = []

function addFinding(level, code, message, details = []) {
  findings.push({ level, code, message, details })
}

function error(code, message, details) {
  addFinding('error', code, message, details)
}

function warn(code, message, details) {
  addFinding('warning', code, message, details)
}

function normalise(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function words(value) {
  return String(value ?? '').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’–—-]*/gu)?.length ?? 0
}

function flattenText(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flattenText).join(' ')
  if (value && typeof value === 'object') return Object.values(value).map(flattenText).join(' ')
  return ''
}

function blockText(blocks) {
  if (!Array.isArray(blocks)) return ''
  return blocks.map((block) => (Array.isArray(block) ? flattenText(block[1]) : '')).join(' ')
}

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    error('MISSING_REQUIRED_COPY', `${label} is missing or empty.`)
    return false
  }
  return true
}

function auditIntent(intent, label, intentEntries) {
  if (!intent || typeof intent !== 'object') {
    error('MISSING_SEARCH_INTENT', `${label} has no search-intent brief.`)
    return
  }

  for (const field of INTENT_FIELDS) {
    requiredString(intent[field], `${label}.intent.${field}`)
  }
  if (intent.intentType && !INTENT_TYPES.has(intent.intentType)) {
    error(
      'INVALID_INTENT_TYPE',
      `${label}.intent.intentType has unsupported value "${String(intent.intentType)}".`,
    )
  }

  intentEntries.push({
    id: label,
    primaryQuery: intent.primaryQuery,
    jobToBeDone: intent.jobToBeDone,
    uniquePromise: intent.uniquePromise,
  })
}

function auditLinkList(values, knownValues, label, kind, self) {
  if (!Array.isArray(values) || values.length === 0) {
    error('MISSING_INTERNAL_LINKS', `${label} has no explicit ${kind} links.`)
    return
  }

  const duplicates = values.filter((value, index) => values.indexOf(value) !== index)
  if (duplicates.length > 0) {
    error('DUPLICATE_INTERNAL_LINK', `${label} repeats ${kind} link target(s).`, [
      ...new Set(duplicates),
    ])
  }

  for (const value of values) {
    if (typeof value !== 'string' || !knownValues.has(value)) {
      error(
        'UNKNOWN_INTERNAL_LINK',
        `${label} references unknown ${kind} target "${String(value)}".`,
      )
    }
    if (self && value === self) {
      error('SELF_INTERNAL_LINK', `${label} links to itself as a ${kind} target.`)
    }
  }
}

function auditLinks(links, indexes, label, self = {}) {
  if (!links || typeof links !== 'object') {
    error('MISSING_INTERNAL_LINKS', `${label} has no explicit internal-link brief.`)
    return
  }

  auditLinkList(links.posts, indexes.posts, label, 'Blog', self.post)
  auditLinkList(links.solutions, indexes.solutions, label, 'Solution', self.solution)
  auditLinkList(links.apps, indexes.apps, label, 'App', self.app)
}

function duplicateGroups(entries, valueForEntry) {
  const groups = new Map()

  for (const entry of entries) {
    const value = normalise(valueForEntry(entry))
    if (!value) continue
    const group = groups.get(value) ?? []
    group.push(entry)
    groups.set(value, group)
  }

  return [...groups.values()].filter((group) => group.length > 1)
}

function requireUnique(entries, valueForEntry, labelForEntry, code, fieldName) {
  for (const group of duplicateGroups(entries, valueForEntry)) {
    error(
      code,
      `Duplicate ${fieldName}: "${String(valueForEntry(group[0]))}".`,
      group.map(labelForEntry),
    )
  }
}

function warnDuplicateMetadata(entries, field, label) {
  for (const group of duplicateGroups(entries, (entry) => entry[field])) {
    warn(
      'DUPLICATE_METADATA',
      `Duplicate ${label} in ${group[0].locale}: "${String(group[0][field])}".`,
      group.map((entry) => entry.id),
    )
  }
}

async function importTypeScriptData(filePath, transform = (source) => source) {
  const source = transform(await readFile(filePath, 'utf8'))
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
    reportDiagnostics: true,
  })
  const failures = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  )

  if (failures.length > 0) {
    const message = ts.formatDiagnosticsWithColorAndContext(failures, {
      getCanonicalFileName: (name) => name,
      getCurrentDirectory: () => REPO_ROOT,
      getNewLine: () => '\n',
    })
    throw new Error(`Cannot read ${relative(REPO_ROOT, filePath)}:\n${message}`)
  }

  const dataUrl = `data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`
  return import(dataUrl)
}

async function loadRepositoryContent() {
  const postsOne = await importTypeScriptData(join(DATA_ROOT, 'posts.ts'), (source) =>
    source
      .replace(/^import\s+\{\s*POSTS_2\s*\}\s+from\s+['"].+?['"]\s*$/m, '')
      .replace(
        /export const POSTS\s*=\s*\[\s*\.\.\.POSTS_1,\s*\.\.\.POSTS_2\s*\]/,
        'export { POSTS_1 }',
      ),
  )
  const [
    postsTwo,
    postImages,
    postFoundations,
    postEditorial,
    postTechnical,
    solutions,
    retiredSolutions,
    categories,
  ] = await Promise.all([
    importTypeScriptData(join(DATA_ROOT, 'posts-2.ts')),
    importTypeScriptData(join(DATA_ROOT, 'post-images.ts')),
    importTypeScriptData(join(DATA_ROOT, 'posts-full-foundations.ts')),
    importTypeScriptData(join(DATA_ROOT, 'posts-full-editorial.ts')),
    importTypeScriptData(join(DATA_ROOT, 'posts-full-technical.ts')),
    importTypeScriptData(join(DATA_ROOT, 'solutions-curated.ts')),
    importTypeScriptData(join(DATA_ROOT, 'solutions-retired.ts')),
    importTypeScriptData(join(APPS_SOURCE_ROOT, 'categories.ts')),
  ])

  const catalogs = Object.fromEntries(
    await Promise.all(
      LOCALES.map(async (locale) => [
        locale,
        JSON.parse(
          await readFile(join(WEB_ROOT, `src/i18n/messages/${locale}/catalog.json`), 'utf8'),
        ),
      ]),
    ),
  )
  const postFullBatches = [
    postFoundations.POSTS_FULL_FOUNDATIONS,
    postEditorial.POSTS_FULL_EDITORIAL,
    postTechnical.POSTS_FULL_TECHNICAL,
  ]

  return {
    posts: [...postsOne.POSTS_1, ...postsTwo.POSTS_2],
    categories: postsOne.CATEGORIES,
    postsFull: Object.assign({}, ...postFullBatches),
    postFullKeys: postFullBatches.flatMap((batch) => Object.keys(batch)),
    postImages: postImages.POST_IMAGES,
    solutions: solutions.SOLUTIONS,
    retiredSolutions: retiredSolutions.RETIRED_SOLUTIONS,
    appCategories: categories.APP_CATEGORIES,
    categoryMembership: categories.APP_CATEGORY_MEMBERSHIP,
    catalogs,
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else files.push(path)
  }

  return files
}

function literalSlugs(source) {
  return [...source.matchAll(/\bslug\s*:\s*(['"])([^'"]+)\1/g)].map((match) => match[2])
}

async function loadManifestIndex() {
  const indexPath = join(APPS_SOURCE_ROOT, 'index.ts')
  const indexSource = await readFile(indexPath, 'utf8')
  const allFiles = await walk(APPS_SOURCE_ROOT)
  const manifestFiles = allFiles.filter((file) => file.endsWith('/manifest.ts'))
  const sourceManifests = []

  for (const file of manifestFiles) {
    const slugs = literalSlugs(await readFile(file, 'utf8'))
    if (slugs.length !== 1) {
      error(
        'INVALID_MANIFEST_SOURCE',
        `${relative(REPO_ROOT, file)} must contain exactly one literal manifest slug.`,
        slugs,
      )
      continue
    }
    sourceManifests.push({ file, slug: slugs[0] })
  }

  const importMap = new Map()
  const importPattern =
    /import\s+\{\s*([A-Za-z][A-Za-z0-9]*Manifest)\s*\}\s+from\s+['"]([^'"]+)['"]/g
  for (const match of indexSource.matchAll(importPattern)) {
    const importedPath = resolve(
      APPS_SOURCE_ROOT,
      match[2].replace(/^\.\//, '').replace(/\.js$/, '.ts'),
    )
    importMap.set(match[1], importedPath)
  }

  const registryBody =
    indexSource.match(/export const APP_MANIFESTS[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1] ?? ''
  if (!registryBody) error('INVALID_MANIFEST_REGISTRY', 'Cannot locate APP_MANIFESTS in index.ts.')

  const registeredFiles = new Set()
  const registeredSlugs = []
  for (const [identifier, path] of importMap) {
    if (!new RegExp(`\\b${identifier}\\b`).test(registryBody)) continue
    registeredFiles.add(path)
    const slug = sourceManifests.find((manifest) => manifest.file === path)?.slug
    if (slug) registeredSlugs.push(slug)
    else {
      error(
        'INVALID_MANIFEST_IMPORT',
        `${identifier} points to a manifest source whose slug could not be read.`,
        [relative(REPO_ROOT, path)],
      )
    }
  }

  for (const manifest of sourceManifests) {
    if (!registeredFiles.has(manifest.file)) {
      error(
        'UNREGISTERED_MANIFEST',
        `Manifest "${manifest.slug}" is not included in APP_MANIFESTS.`,
        [relative(REPO_ROOT, manifest.file)],
      )
    }
  }

  const newsPath = join(APPS_SOURCE_ROOT, 'rss/news.ts')
  const newsSlugs = literalSlugs(await readFile(newsPath, 'utf8'))
  if (registryBody.includes('...NEWS_MANIFESTS')) registeredSlugs.push(...newsSlugs)
  else {
    error(
      'UNREGISTERED_NEWS_MANIFESTS',
      'APP_MANIFESTS does not include the NEWS_MANIFESTS registry.',
    )
  }

  return {
    slugs: registeredSlugs,
    newsSlugs,
  }
}

function auditPosts(content, indexes, metadataEntries, intentEntries) {
  const { posts, postsFull, postFullKeys, postImages } = content
  const categorySlugs = new Set(content.categories.map((category) => category.slug))

  if (posts.length !== EXPECTED_POST_COUNT) {
    error(
      'INVALID_BLOG_COUNT',
      `Expected exactly ${String(EXPECTED_POST_COUNT)} Blog posts, found ${String(posts.length)}.`,
    )
  }
  requireUnique(
    postFullKeys,
    (slug) => slug,
    (slug) => `full-blog:${slug}`,
    'DUPLICATE_FULL_POST',
    'full Blog package key',
  )
  requireUnique(
    content.categories,
    (category) => category.slug,
    (category) => `category:${category.slug}`,
    'DUPLICATE_CATEGORY_SLUG',
    'blog category slug',
  )
  requireUnique(
    posts,
    (post) => post.slug,
    (post) => `blog:sr:${post.slug}`,
    'DUPLICATE_BLOG_SLUG',
    'Serbian blog slug',
  )
  requireUnique(
    posts,
    (post) => post.en?.slug,
    (post) => `blog:en:${post.en?.slug ?? post.slug}`,
    'DUPLICATE_BLOG_SLUG',
    'English blog slug',
  )

  const postSlugs = new Set(posts.map((post) => post.slug))
  for (const key of Object.keys(postsFull)) {
    if (!postSlugs.has(key)) {
      error('ORPHAN_FULL_POST', `Full editorial post copy has no base post: "${key}".`)
    }
  }
  for (const key of Object.keys(postImages)) {
    if (!postSlugs.has(key)) error('ORPHAN_POST_IMAGES', `Image data has no base post: "${key}".`)
  }

  for (const post of posts) {
    const id = `blog:${post.slug}`
    const editorial = postsFull[post.slug]
    if (!categorySlugs.has(post.category)) {
      error('UNKNOWN_POST_CATEGORY', `${id} references unknown category "${post.category}".`)
    }
    if (!postImages[post.slug]) {
      error('MISSING_POST_IMAGES', `${id} has no image data.`)
    }
    if (Number.isNaN(Date.parse(post.publishedAt))) {
      error('INVALID_PUBLISHED_DATE', `${id} has an invalid publishedAt value.`)
    }
    if (!editorial) {
      error('MISSING_FULL_POST', `${id} has no reviewed full editorial package.`)
      continue
    }

    auditLinks(editorial.links, indexes, id, { post: post.slug })

    for (const locale of LOCALES) {
      const localized = post[locale]
      if (!localized || typeof localized !== 'object') {
        error('MISSING_POST_LOCALE', `${id} is missing the ${locale} locale.`)
        continue
      }
      requiredString(localized.title, `${id}:${locale}.title`)
      requiredString(localized.metaTitle, `${id}:${locale}.metaTitle`)
      requiredString(localized.metaDescription, `${id}:${locale}.metaDescription`)
      requiredString(localized.excerpt, `${id}:${locale}.excerpt`)
      if (locale === 'en') requiredString(localized.slug, `${id}:en.slug`)

      const full = editorial[locale]
      if (!full || typeof full !== 'object') {
        error('MISSING_POST_LOCALE', `${id} full editorial package is missing ${locale}.`)
        continue
      }
      auditIntent(full.intent, `${id}:${locale}`, intentEntries)

      if (!Array.isArray(full.takeaways) || full.takeaways.length < 3) {
        error(
          'MISSING_POST_TAKEAWAYS',
          `${id}:${locale} needs at least three distinct key takeaways.`,
        )
      } else {
        for (const [index, takeaway] of full.takeaways.entries()) {
          requiredString(takeaway, `${id}:${locale}.takeaways[${String(index)}]`)
        }
        if (new Set(full.takeaways.map(normalise)).size !== full.takeaways.length) {
          error('DUPLICATE_POST_TAKEAWAY', `${id}:${locale} repeats a key takeaway.`)
        }
      }

      const contentBlocks = full.content
      if (!Array.isArray(contentBlocks) || contentBlocks.length === 0) {
        error('MISSING_POST_BODY', `${id}:${locale} has no content blocks.`)
        continue
      }

      const figureCount = postImages[post.slug]?.figures?.length ?? 0
      for (const block of contentBlocks) {
        if (
          Array.isArray(block) &&
          block[0] === 'fig' &&
          (!Number.isInteger(block[1]) || block[1] < 0 || block[1] >= figureCount)
        ) {
          error(
            'INVALID_POST_FIGURE',
            `${id}:${locale} references figure ${String(block[1])}, but ${String(figureCount)} exist.`,
          )
        }
      }

      const count = words(blockText(contentBlocks))
      if (count < 350) {
        error('THIN_BLOG_CONTENT', `${id}:${locale} has ${String(count)} body words (minimum 350).`)
      }

      for (const [index, reference] of (full.references ?? []).entries()) {
        requiredString(reference?.title, `${id}:${locale}.references[${String(index)}].title`)
        if (
          !requiredString(reference?.url, `${id}:${locale}.references[${String(index)}].url`) ||
          !/^https?:\/\//i.test(reference.url)
        ) {
          error(
            'INVALID_POST_REFERENCE',
            `${id}:${locale}.references[${String(index)}] must use an absolute HTTP(S) URL.`,
          )
        }
      }

      metadataEntries.push({
        id: `${id}:${locale}`,
        locale,
        title: localized.metaTitle,
        description: localized.metaDescription,
      })
    }
  }
}

function auditSolutions(content, indexes, metadataEntries, intentEntries) {
  const { solutions, retiredSolutions } = content

  if (solutions.length !== EXPECTED_SOLUTION_COUNT) {
    error(
      'INVALID_SOLUTION_COUNT',
      `Expected exactly ${String(EXPECTED_SOLUTION_COUNT)} Solutions, found ${String(solutions.length)}.`,
    )
  }
  if (retiredSolutions.length !== EXPECTED_RETIRED_SOLUTION_COUNT) {
    error(
      'INVALID_RETIRED_SOLUTION_COUNT',
      `Expected ${String(EXPECTED_RETIRED_SOLUTION_COUNT)} retired Solution identifiers, found ${String(retiredSolutions.length)}.`,
    )
  }
  requireUnique(
    solutions,
    (solution) => solution.slug,
    (solution) => `solution:en:${solution.slug}`,
    'DUPLICATE_SOLUTION_SLUG',
    'English solution slug',
  )
  requireUnique(
    solutions,
    (solution) => solution.srSlug,
    (solution) => `solution:sr:${solution.srSlug}`,
    'DUPLICATE_SOLUTION_SLUG',
    'Serbian solution slug',
  )
  requireUnique(
    solutions,
    (solution) => solution.order,
    (solution) => `solution:${solution.slug}`,
    'DUPLICATE_SOLUTION_ORDER',
    'solution order',
  )

  const solutionSlugs = new Set(solutions.map((solution) => solution.slug))
  const solutionSrSlugs = new Set(solutions.map((solution) => solution.srSlug))
  requireUnique(
    retiredSolutions,
    (solution) => solution.slug,
    (solution) => `retired-solution:en:${solution.slug}`,
    'DUPLICATE_RETIRED_SOLUTION_SLUG',
    'retired English Solution slug',
  )
  requireUnique(
    retiredSolutions,
    (solution) => solution.srSlug,
    (solution) => `retired-solution:sr:${solution.srSlug}`,
    'DUPLICATE_RETIRED_SOLUTION_SLUG',
    'retired Serbian Solution slug',
  )
  for (const retired of retiredSolutions) {
    if (solutionSlugs.has(retired.slug) || solutionSrSlugs.has(retired.srSlug)) {
      error(
        'ACTIVE_RETIRED_SOLUTION_OVERLAP',
        `Retired Solution "${retired.slug}" still exists in the active six-page catalog.`,
      )
    }
    if (retired.redirectTo && !solutionSlugs.has(retired.redirectTo)) {
      error(
        'UNKNOWN_RETIREMENT_REDIRECT',
        `Retired Solution "${retired.slug}" redirects to unknown active key "${retired.redirectTo}".`,
      )
    }
  }

  for (const solution of solutions) {
    const id = `solution:${solution.slug}`
    requiredString(solution.icon, `${id}.icon`)
    auditLinks(solution.links, indexes, id, { solution: solution.slug })

    const recommendedApps = String(solution.recommendedApps ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean)

    for (const slug of recommendedApps) {
      if (!indexes.apps.has(slug)) {
        error('UNKNOWN_RECOMMENDED_APP', `${id} recommends unknown app "${slug}".`)
      }
    }
    if (new Set(recommendedApps).size !== recommendedApps.length) {
      error('DUPLICATE_RECOMMENDED_APP', `${id} contains the same recommended app more than once.`)
    }
    if (
      normalise([...recommendedApps].sort().join(' ')) !==
      normalise([...(solution.links?.apps ?? [])].sort().join(' '))
    ) {
      error(
        'MISMATCHED_SOLUTION_APPS',
        `${id} recommendedApps and explicit App links must contain the same keys.`,
      )
    }

    for (const locale of LOCALES) {
      const localized = solution[locale]
      if (!localized || typeof localized !== 'object') {
        error('MISSING_SOLUTION_LOCALE', `${id} is missing the ${locale} locale.`)
        continue
      }
      for (const field of [
        'name',
        'tagline',
        'title',
        'subtitle',
        'metaTitle',
        'metaDescription',
      ]) {
        requiredString(localized[field], `${id}:${locale}.${field}`)
      }
      auditIntent(localized.intent, `${id}:${locale}`, intentEntries)

      requiredString(localized.intro, `${id}:${locale}.intro`)
      requiredString(localized.proof?.title, `${id}:${locale}.proof.title`)
      requiredString(localized.proof?.body, `${id}:${locale}.proof.body`)
      if (!Array.isArray(localized.scenarios) || localized.scenarios.length < 5) {
        error('MISSING_SOLUTION_SCENARIOS', `${id}:${locale} needs at least five scenarios.`)
      } else {
        for (const [index, scenario] of localized.scenarios.entries()) {
          requiredString(scenario?.title, `${id}:${locale}.scenarios[${String(index)}].title`)
          requiredString(scenario?.body, `${id}:${locale}.scenarios[${String(index)}].body`)
        }
      }
      if (!Array.isArray(localized.benefits) || localized.benefits.length < 3) {
        error('MISSING_SOLUTION_BENEFITS', `${id}:${locale} needs at least three benefits.`)
      } else {
        for (const [index, benefit] of localized.benefits.entries()) {
          requiredString(benefit, `${id}:${locale}.benefits[${String(index)}]`)
        }
      }
      if (!Array.isArray(localized.faq) || localized.faq.length < 6) {
        error('MISSING_SOLUTION_FAQ', `${id}:${locale} needs at least six FAQs.`)
      } else {
        for (const [index, item] of localized.faq.entries()) {
          requiredString(item?.q, `${id}:${locale}.faq[${String(index)}].q`)
          requiredString(item?.a, `${id}:${locale}.faq[${String(index)}].a`)
        }
      }

      const count = words(
        flattenText({
          intro: localized.intro,
          scenarios: localized.scenarios,
          benefits: localized.benefits,
          proof: localized.proof,
          faq: localized.faq,
        }),
      )
      if (count < 300) {
        error(
          'THIN_SOLUTION_CONTENT',
          `${id}:${locale} has ${String(count)} supporting-content words (minimum 300).`,
        )
      }

      metadataEntries.push({
        id: `${id}:${locale}`,
        locale,
        title: localized.metaTitle,
        description: localized.metaDescription,
      })
    }
  }
}

function tokenSet(value) {
  return new Set(
    normalise(value)
      .split(' ')
      .filter((token) => token.length > 2),
  )
}

function jaccard(left, right) {
  if (left.size === 0 && right.size === 0) return 1
  let intersection = 0
  for (const value of left) {
    if (right.has(value)) intersection++
  }
  return intersection / (left.size + right.size - intersection)
}

function auditIntentSeparation(intentEntries) {
  for (const locale of LOCALES) {
    const entries = intentEntries.filter((entry) => entry.id.endsWith(`:${locale}`))

    requireUnique(
      entries,
      (entry) => entry.primaryQuery,
      (entry) => entry.id,
      'DUPLICATE_PRIMARY_QUERY',
      `${locale} primary search query`,
    )
    requireUnique(
      entries,
      (entry) => entry.jobToBeDone,
      (entry) => entry.id,
      'DUPLICATE_SEARCH_JOB',
      `${locale} search job`,
    )
    requireUnique(
      entries,
      (entry) => entry.uniquePromise,
      (entry) => entry.id,
      'DUPLICATE_UNIQUE_PROMISE',
      `${locale} unique promise`,
    )

    const similarPairs = []
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex++) {
        const left = entries[leftIndex]
        const right = entries[rightIndex]
        const similarity = jaccard(
          tokenSet(`${left.primaryQuery} ${left.jobToBeDone} ${left.uniquePromise}`),
          tokenSet(`${right.primaryQuery} ${right.jobToBeDone} ${right.uniquePromise}`),
        )
        if (similarity >= 0.8) {
          similarPairs.push(
            `${left.id} ↔ ${right.id}: ${String(Math.round(similarity * 100))}% intent-token overlap`,
          )
        }
      }
    }
    if (similarPairs.length > 0) {
      warn(
        'NEAR_DUPLICATE_SEARCH_INTENT',
        `${locale} content has ${String(similarPairs.length)} intent pair(s) that require editorial review.`,
        similarPairs,
      )
    }
  }
}

function auditNewsSimilarity(newsSlugs, catalogs) {
  for (const locale of LOCALES) {
    const similarPairs = []

    for (let leftIndex = 0; leftIndex < newsSlugs.length; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < newsSlugs.length; rightIndex++) {
        const leftSlug = newsSlugs[leftIndex]
        const rightSlug = newsSlugs[rightIndex]
        const left = tokenSet(catalogs[locale]?.[leftSlug]?.about)
        const right = tokenSet(catalogs[locale]?.[rightSlug]?.about)
        const similarity = jaccard(left, right)
        if (similarity >= 0.72) {
          similarPairs.push(
            `${leftSlug} ↔ ${rightSlug}: ${String(Math.round(similarity * 100))}% token overlap`,
          )
        }
      }
    }

    if (similarPairs.length > 0) {
      warn(
        'NEAR_DUPLICATE_NEWS_APPS',
        `${locale} branded news app copy forms ${String(similarPairs.length)} near-duplicate pair(s).`,
        similarPairs,
      )
    }
  }
}

function auditApps(content, manifestIndex, metadataEntries) {
  const manifestSlugs = new Set(manifestIndex.slugs)
  const membershipSlugs = new Set(Object.keys(content.categoryMembership))
  const categorySlugs = new Set(content.appCategories.map((category) => category.slug))

  requireUnique(
    manifestIndex.slugs,
    (slug) => slug,
    (slug) => `manifest:${slug}`,
    'DUPLICATE_MANIFEST_SLUG',
    'app manifest slug',
  )
  requireUnique(
    content.appCategories,
    (category) => category.slug,
    (category) => `app-category:${category.slug}`,
    'DUPLICATE_APP_CATEGORY',
    'app category slug',
  )
  requireUnique(
    content.appCategories,
    (category) => category.order,
    (category) => `app-category:${category.slug}`,
    'DUPLICATE_APP_CATEGORY_ORDER',
    'app category order',
  )

  for (const slug of manifestSlugs) {
    if (!membershipSlugs.has(slug)) {
      error('MISSING_APP_CATEGORY_MEMBERSHIP', `Manifest "${slug}" has no category membership.`)
    }
  }
  for (const slug of membershipSlugs) {
    if (!manifestSlugs.has(slug)) {
      error('UNKNOWN_MEMBERSHIP_APP', `Category membership references unknown app "${slug}".`)
    }
    const categories = content.categoryMembership[slug]
    if (!Array.isArray(categories) || categories.length === 0) {
      error('EMPTY_APP_CATEGORY_MEMBERSHIP', `App "${slug}" has no categories.`)
      continue
    }
    if (new Set(categories).size !== categories.length) {
      error('DUPLICATE_APP_CATEGORY_MEMBERSHIP', `App "${slug}" repeats a category.`)
    }
    for (const category of categories) {
      if (!categorySlugs.has(category)) {
        error('UNKNOWN_APP_CATEGORY', `App "${slug}" references unknown category "${category}".`)
      }
    }
  }

  const thinByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, []]))
  for (const locale of LOCALES) {
    const catalog = content.catalogs[locale]
    const catalogSlugs = new Set(Object.keys(catalog))

    for (const slug of manifestSlugs) {
      const entry = catalog[slug]
      if (!entry || typeof entry !== 'object') {
        error('MISSING_APP_TRANSLATION', `${locale} catalog is missing app "${slug}".`)
        continue
      }
      for (const field of ['tagline', 'description', 'about']) {
        requiredString(entry[field], `app:${slug}:${locale}.${field}`)
      }

      const count = words(entry.about)
      if (count < 120) thinByLocale[locale].push(`${slug} (${String(count)})`)

      metadataEntries.push({
        id: `app:${slug}:${locale}`,
        locale,
        title: entry.tagline,
        description: entry.description,
      })
    }

    for (const slug of catalogSlugs) {
      if (!manifestSlugs.has(slug)) {
        error('ORPHAN_APP_TRANSLATION', `${locale} catalog contains unknown app "${slug}".`)
      }
    }
  }

  for (const locale of LOCALES) {
    const thin = thinByLocale[locale]
    if (thin.length > 0) {
      warn(
        'THIN_APP_CONTENT',
        `${String(thin.length)}/${String(manifestSlugs.size)} ${locale} app pages have fewer than 120 words in their main "about" copy.`,
        thin,
      )
    }
  }

  auditNewsSimilarity(manifestIndex.newsSlugs, content.catalogs)
}

function auditMetadata(metadataEntries) {
  for (const locale of LOCALES) {
    const entries = metadataEntries.filter((entry) => entry.locale === locale)
    warnDuplicateMetadata(entries, 'title', 'primary title-like metadata')
    warnDuplicateMetadata(entries, 'description', 'meta description')
  }
}

function printHumanReport(durationMs, contentCounts) {
  const errors = findings.filter((finding) => finding.level === 'error')
  const warnings = findings.filter((finding) => finding.level === 'warning')

  console.log('SEO content audit (repository sources only; no database)')
  console.log(
    `Checked ${String(contentCounts.posts)} posts, ${String(contentCounts.solutions)} solutions and ${String(contentCounts.apps)} apps in ${String(durationMs)}ms.`,
  )

  if (errors.length > 0) {
    console.log(`\nStructural errors (${String(errors.length)}):`)
    for (const finding of errors) printFinding(finding)
  } else {
    console.log('\nStructural integrity: OK')
  }

  if (warnings.length > 0) {
    console.log(`\nEditorial warnings (${String(warnings.length)}; do not fail the command):`)
    for (const finding of warnings) printFinding(finding)
  } else {
    console.log('\nEditorial warnings: none')
  }

  console.log(
    `\nResult: ${String(errors.length)} structural error(s), ${String(warnings.length)} editorial warning(s).`,
  )
}

function printFinding(finding) {
  console.log(`  [${finding.code}] ${finding.message}`)
  for (const detail of finding.details) console.log(`    - ${detail}`)
}

async function main() {
  const startedAt = Date.now()
  const content = await loadRepositoryContent()
  const manifestIndex = await loadManifestIndex()
  const manifestSlugs = new Set(manifestIndex.slugs)
  const metadataEntries = []
  const intentEntries = []
  const indexes = {
    posts: new Set(content.posts.map((post) => post.slug)),
    solutions: new Set(content.solutions.map((solution) => solution.slug)),
    apps: manifestSlugs,
  }

  auditPosts(content, indexes, metadataEntries, intentEntries)
  auditSolutions(content, indexes, metadataEntries, intentEntries)
  auditIntentSeparation(intentEntries)
  auditApps(content, manifestIndex, metadataEntries)
  auditMetadata(metadataEntries)

  const errors = findings.filter((finding) => finding.level === 'error')
  const payload = {
    checkedAt: new Date().toISOString(),
    sources: 'repository',
    counts: {
      posts: content.posts.length,
      solutions: content.solutions.length,
      apps: manifestSlugs.size,
    },
    summary: {
      structuralErrors: errors.length,
      editorialWarnings: findings.length - errors.length,
    },
    findings,
  }

  if (process.argv.includes('--json')) console.log(JSON.stringify(payload, null, 2))
  else printHumanReport(Date.now() - startedAt, payload.counts)

  process.exitCode = errors.length > 0 ? 1 : 0
}

main().catch((cause) => {
  console.error('SEO content audit could not run.')
  console.error(cause instanceof Error ? cause.stack : cause)
  process.exitCode = 1
})
