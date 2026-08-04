import { RichText } from '@payloadcms/richtext-lexical/react'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { cache } from 'react'

import { AppCard } from '@/components/apps/app-card'
import { BlogCard } from '@/components/blog/blog-card'
import { NewsletterSignup } from '@/components/blog/newsletter-signup'
import { ContentBreadcrumbs, ContentMeta, KeyTakeaways, RelatedContent } from '@/components/content'
import { CtaBand } from '@/components/marketing/cta-band'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld'
import { SolutionIcon } from '@/components/solutions/solution-icon'
import { Badge } from '@/components/ui/badge'
import { CatalogCard } from '@/components/ui/catalog-card'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { Heading, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { appManifestBySlug, isAppPageSeoEligible } from '@/lib/apps'
import {
  contentRecordIsApproved,
  contentRecordMayBeIndexed,
  getEditorialState,
  getPayloadClient,
  legacyContentDefaults,
  mediaUrl,
  slugPair,
} from '@/lib/payload'
import { listPostRefs, listRelatedPosts, readingMinutes } from '@/lib/posts'
import { executeContentRedirect, findContentRedirect } from '@/lib/redirects'
import { pageMetadata, publicPath } from '@/lib/seo'
import type { Media } from '@/payload-types'

/* ISR rather than `force-dynamic`. The content behind this page changes when
   an editor publishes, not per request, so re-rendering on every hit spent a
   database round trip to produce the same HTML. Two days is deliberately far
   past how often this copy moves: the window costs one render per page rather
   than one per hour, which is what keeps this inside the hosting plan. A
   publish that needs to be live sooner is pushed with a redeploy instead of
   making every reader pay for the check. */
export const revalidate = 172_800

/* Prebuild every published post for this locale. The parent segment already
   enumerates locales, so this runs once per locale and must return only that
   locale's slugs — returning both would prerender each post under the wrong
   language too, where it only 308s away again. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const posts = await listPostRefs()
  const locale = params.locale === 'sr' ? 'sr' : 'en'
  return posts
    .filter((post) => post.availability[locale] === true)
    .map((post) => ({ slug: post.slug[locale] }))
}

/* Deliberately no `searchParams`. This route is prerendered — statically at
   build for the slugs `generateStaticParams` returns, and on demand through ISR
   for anything else. `searchParams` is a dynamic API and reading it inside a
   prerender throws `DYNAMIC_SERVER_USAGE`, which Next surfaces as a 500.
   Because it was read only on the redirect branch, every valid post rendered
   fine and every genuinely missing slug 404'd, while the one case in between —
   a real post addressed by its *other* language's slug — answered 500 instead
   of the 308 it was written to send. Around a hundred URLs, and exactly the
   ones a language switch or an old shared link lands on.

   The redirect therefore drops the query string rather than the response. */
interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

const fetchPost = cache(async (locale: string, slug: string) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    locale: locale as 'sr' | 'en',
    fallbackLocale: false,
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await fetchPost(locale, slug)
  if (!post) return {}

  const cover = typeof post.coverImage === 'object' ? post.coverImage?.url : null
  const state = await getEditorialState('posts', post.id, legacyContentDefaults())
  const currentLocale = locale === 'sr' ? 'sr' : 'en'
  const seo = state.seo[currentLocale] ?? {}
  const paths = {
    sr: { pathname: '/blog/[slug]' as const, params: { slug: state.slugs.sr } },
    en: { pathname: '/blog/[slug]' as const, params: { slug: state.slugs.en } },
  }

  /* The headline is written for the page; `metaTitle` is written for the
     result list. Fall back rather than require it — an unfilled SEO field
     should never produce an empty <title>. */
  const metaTitle = seo.metaTitle ?? post.metaTitle ?? post.title
  const metaDescription = seo.metaDescription ?? post.metaDescription ?? post.excerpt

  return pageMetadata({
    locale,
    path: paths,
    type: 'article',
    title: metaTitle,
    description: metaDescription ?? undefined,
    ogTitle: seo.ogTitle ?? undefined,
    ogDescription: seo.ogDescription ?? undefined,
    image: mediaUrl(seo.ogImage) ?? cover ?? undefined,
    publishedTime: post.publishedAt ?? undefined,
    modifiedTime: post.updatedAt,
    indexable: state.indexable[currentLocale] === true,
    availability: state.availability,
    canonical: seo.canonicalOverride ?? undefined,
  })
}

export default async function PostPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('blog')
  const tc = await getTranslations('common')
  const post = await fetchPost(locale, slug)
  /* Slugs are localised, so /blog/<serbian-slug> names a real post in the
     wrong language. Send it to that post's English URL rather than a 404 — a
     language switch or an old shared link should not dead-end. */
  if (!post) {
    const other = await fetchPost(locale === 'en' ? 'sr' : 'en', slug)
    if (other) {
      const slugs = await slugPair('posts', other.id)
      const targetSlug = locale === 'en' ? slugs.en : slugs.sr
      if (targetSlug) {
        executeContentRedirect({
          toPath: publicPath(locale, {
            pathname: '/blog/[slug]',
            params: { slug: targetSlug },
          }),
          statusCode: 308,
          preserveQuery: false,
        })
      }
    }
    const redirect = await findContentRedirect(
      publicPath(locale, { pathname: '/blog/[slug]', params: { slug } }),
    )
    if (redirect) executeContentRedirect(redirect)
    notFound()
  }

  const category = typeof post.category === 'object' ? post.category : null
  const author = typeof post.author === 'object' ? post.author : null
  const cover = typeof post.coverImage === 'object' ? post.coverImage : null
  const date = post.publishedAt ?? post.createdAt
  const minutes = readingMinutes(post.content)
  const preferredRelatedIds = (post.relatedPosts ?? []).map((relatedPost) =>
    typeof relatedPost === 'object' ? relatedPost.id : relatedPost,
  )
  const related = await listRelatedPosts(locale, post.id, category?.id ?? null, preferredRelatedIds)
  const relatedSolutions = (post.relatedSolutions ?? []).flatMap((solution) =>
    typeof solution === 'object' &&
    solution._status === 'published' &&
    contentRecordIsApproved(solution)
      ? [solution]
      : [],
  )
  const relatedApps = (post.relatedApps ?? []).flatMap((appPage) => {
    if (
      typeof appPage !== 'object' ||
      appPage._status !== 'published' ||
      appPage.localeReady !== true ||
      appPage.seo?.indexable !== true ||
      appPage.seo.canonicalOverride ||
      !isAppPageSeoEligible(appPage.appKey)
    ) {
      return []
    }
    const manifest = appManifestBySlug.get(appPage.appKey)
    return manifest ? [{ appPage, manifest }] : []
  })

  return (
    <>
      {contentRecordMayBeIndexed(post) ? (
        <ArticleJsonLd
          article={{
            locale,
            path: { pathname: '/blog/[slug]', params: { slug } },
            title: post.title,
            description: post.excerpt ?? undefined,
            image: cover?.url ?? undefined,
            published: date,
            modified: post.updatedAt,
            author: author?.name ?? undefined,
            section: category?.title ?? undefined,
            canonical: post.seo?.canonicalOverride ?? undefined,
          }}
        />
      ) : null}
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: 'SignageWall', path: '/' },
          { name: t('hero.title'), path: '/blog' },
          { name: post.title },
        ]}
      />
      <SectionStack>
        <Section innerClassName="py-14 md:py-20">
          <ContentBreadcrumbs
            ariaLabel={tc('breadcrumbs')}
            items={[
              { id: 'home', label: 'SignageWall', href: '/' },
              { id: 'blog', label: t('hero.eyebrow'), href: '/blog' },
              { id: post.id, label: post.title },
            ]}
          />
          <Link
            href="/blog"
            className="group mt-6 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {t('back')}
          </Link>
          <div className="mt-8 max-w-3xl">
            {category ? <Badge>{category.title}</Badge> : null}
            {/* The post title is this page's H1. It was a <Title> (h2), which
                left every article starting at h2 with no h1 at all. */}
            <Heading className="mt-4 text-3xl md:text-5xl">{post.title}</Heading>
            <ContentMeta
              className="mt-5"
              locale={locale}
              author={author?.name}
              publishedAt={date}
              readingTime={t('readingTime', { minutes })}
            />
          </div>
          {cover?.url ? (
            /* The article's LCP element: `priority` so it is not lazy-loaded
               behind everything else, and a `sizes` cap because the container
               never exceeds the page gutter. */
            <div className="relative mt-10 aspect-video w-full border border-secondary">
              <Image
                src={cover.url}
                alt={cover.alt ?? ''}
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover"
              />
            </div>
          ) : null}
        </Section>

        <Section innerClassName="max-w-3xl">
          <KeyTakeaways
            title={t('keyTakeawaysTitle')}
            items={(post.keyTakeaways ?? []).map((item) => item.text)}
            className="mb-10"
          />
          <Prose>
            {post.content ? (
              <RichText
                data={post.content}
                converters={({ defaultConverters }) => ({
                  ...defaultConverters,
                  /* Images in the body render as real figures with a caption
                     and photographer credit. The default converter emits a bare
                     <img>, which loses both — and the caption is most of why
                     the picture is there at all. */
                  upload: ({ node }) => {
                    // `node.value` widens to every collection; depth 2 means it
                    // is always a populated Media doc here.
                    const media = node.value as Media | string
                    if (typeof media !== 'object' || !media.url) return null
                    return (
                      <figure className="mt-8">
                        {/* Body figures sit inside the max-w-3xl prose column,
                            so they never need more than 768px. */}
                        <div className="relative aspect-video w-full border border-secondary">
                          <Image
                            src={media.url}
                            alt={media.alt ?? ''}
                            fill
                            sizes="(max-width: 768px) 100vw, 768px"
                            className="object-cover"
                          />
                        </div>
                        {(media.caption ?? media.credit) ? (
                          <figcaption className="mt-3 text-xs text-secondary">
                            {media.caption}
                            {media.credit ? (
                              <span className="opacity-70">
                                {media.caption ? ' · ' : ''}
                                {/* Was a hard-coded "Foto:", i.e. Serbian on
                                    every English article. */}
                                {t('photoCredit', { credit: media.credit })}
                              </span>
                            ) : null}
                          </figcaption>
                        ) : null}
                      </figure>
                    )
                  },
                })}
              />
            ) : null}
          </Prose>
          {(post.references ?? []).length > 0 ? (
            <aside className="mt-12 border-t border-secondary pt-8">
              <Title className="text-xl">{t('referencesTitle')}</Title>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-secondary">
                {(post.references ?? []).map((reference) => (
                  <li key={reference.id ?? reference.url}>
                    <a
                      href={reference.url}
                      rel="noreferrer"
                      className="underline underline-offset-4 transition-colors hover:text-accent"
                    >
                      {reference.title}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}

          {/* Between the last paragraph and the "read this next" grid: the
              reader has finished and is deciding whether to leave. */}
          <div className="mt-12">
            <NewsletterSignup />
          </div>
        </Section>

        {related.length > 0 && (
          <Section tone="panel">
            <RelatedContent title={t('relatedTitle')} gridClassName="gap-6">
              {related.map((r) => (
                <BlogCard
                  key={r.slug}
                  locale={locale}
                  post={{
                    slug: r.slug,
                    title: r.title,
                    excerpt: r.excerpt,
                    date: null,
                    coverUrl: r.coverUrl,
                    categoryTitle: null,
                  }}
                />
              ))}
            </RelatedContent>
          </Section>
        )}

        {relatedSolutions.length > 0 ? (
          <Section>
            <RelatedContent title={t('relatedSolutionsTitle')}>
              {relatedSolutions.map((solution) => (
                <CatalogCard
                  key={solution.id}
                  href={{
                    pathname: '/solutions/[industry]',
                    params: { industry: solution.slug },
                  }}
                  icon={<SolutionIcon icon={solution.icon} className="size-5" />}
                  name={solution.name}
                  tagline={solution.tagline}
                />
              ))}
            </RelatedContent>
          </Section>
        ) : null}

        {relatedApps.length > 0 ? (
          <Section tone="panel">
            <RelatedContent title={t('relatedAppsTitle')}>
              {relatedApps.map(({ appPage, manifest }) => (
                <AppCard
                  key={appPage.id}
                  slug={appPage.slug}
                  name={appPage.name}
                  tagline={appPage.summary ?? manifest.tagline}
                  icon={manifest.icon ?? ''}
                  className="bg-page"
                />
              ))}
            </RelatedContent>
          </Section>
        ) : null}

        <CtaBand />
      </SectionStack>
    </>
  )
}
