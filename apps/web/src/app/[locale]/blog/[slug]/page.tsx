import { RichText } from '@payloadcms/richtext-lexical/react'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BlogCard } from '@/components/blog/blog-card'
import { CtaBand } from '@/components/marketing/cta-band'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld'
import { Badge } from '@/components/ui/badge'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { Heading, Title } from '@/components/ui/typography'
import { Link, permanentRedirect } from '@/i18n/navigation'
import { getPayloadClient, slugPair } from '@/lib/payload'
import { listPostRefs, listRelatedPosts, readingMinutes } from '@/lib/posts'
import { localeAlternates, openGraphMeta } from '@/lib/seo'
import type { Media } from '@/payload-types'

/* ISR rather than `force-dynamic`. The content behind this page changes when
   an editor publishes, not per request, so re-rendering on every hit spent a
   database round trip to produce the same HTML. An hour is well inside how
   often this copy actually moves. */
export const revalidate = 3600

/* Prebuild every published post for this locale. The parent segment already
   enumerates locales, so this runs once per locale and must return only that
   locale's slugs — returning both would prerender each post under the wrong
   language too, where it only 308s away again. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const posts = await listPostRefs()
  return posts.map((p) => ({ slug: params.locale === 'en' ? p.slug.en : p.slug.sr }))
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

async function fetchPost(locale: string, slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    locale: locale as 'sr' | 'en',
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await fetchPost(locale, slug)
  if (!post) return {}

  const cover = typeof post.coverImage === 'object' ? post.coverImage?.url : null
  const slugs = await slugPair('posts', post.id)
  const paths = {
    sr: { pathname: '/blog/[slug]' as const, params: { slug: slugs.sr } },
    en: { pathname: '/blog/[slug]' as const, params: { slug: slugs.en } },
  }

  /* The headline is written for the page; `metaTitle` is written for the
     result list. Fall back rather than require it — an unfilled SEO field
     should never produce an empty <title>. */
  const metaTitle = post.metaTitle ?? post.title
  const metaDescription = post.metaDescription ?? post.excerpt

  return {
    title: metaTitle,
    ...(metaDescription ? { description: metaDescription } : {}),
    alternates: localeAlternates(locale, paths),
    openGraph: openGraphMeta({
      locale,
      path: paths,
      type: 'article',
      title: metaTitle,
      description: metaDescription ?? undefined,
      // Relative media path; `metadataBase` in the root layout absolutises it.
      image: cover ?? undefined,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
    }),
  }
}

export default async function PostPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('blog')
  const post = await fetchPost(locale, slug)
  /* Slugs are localised, so /en/blog/<serbian-slug> names a real post in the
     wrong language. Send it to that post's English URL rather than a 404 — a
     language switch or an old shared link should not dead-end. */
  if (!post) {
    const other = await fetchPost(locale === 'en' ? 'sr' : 'en', slug)
    if (other) {
      const slugs = await slugPair('posts', other.id)
      permanentRedirect({
        href: {
          pathname: '/blog/[slug]',
          params: { slug: locale === 'en' ? slugs.en : slugs.sr },
        },
        locale,
      })
    }
    notFound()
  }

  const category = typeof post.category === 'object' ? post.category : null
  const author = typeof post.author === 'object' ? post.author : null
  const cover = typeof post.coverImage === 'object' ? post.coverImage : null
  const date = post.publishedAt ?? post.createdAt
  const dateStr = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(date))
  const minutes = readingMinutes(post.content)
  const related = await listRelatedPosts(locale, post.id, category?.id ?? null)

  return (
    <>
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
        }}
      />
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
          <Link
            href="/blog"
            className="group inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {t('back')}
          </Link>
          <div className="mt-8 max-w-3xl">
            {category ? <Badge>{category.title}</Badge> : null}
            {/* The post title is this page's H1. It was a <Title> (h2), which
                left every article starting at h2 with no h1 at all. */}
            <Heading className="mt-4 text-3xl md:text-5xl">{post.title}</Heading>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary">
              {author?.name ? <span>{author.name}</span> : null}
              {author?.name ? <span aria-hidden>·</span> : null}
              <span>{dateStr}</span>
              <span aria-hidden>·</span>
              <span>{t('readingTime', { minutes })}</span>
            </div>
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
        </Section>

        {related.length > 0 && (
          <Section tone="panel">
            <Title className="text-2xl md:text-3xl">{t('relatedTitle')}</Title>
            {/* Twenty posts that linked to nothing were twenty dead ends. */}
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
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
            </div>
          </Section>
        )}

        <CtaBand />
      </SectionStack>
    </>
  )
}
