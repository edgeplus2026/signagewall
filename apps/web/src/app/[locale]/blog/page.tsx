import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BlogCard } from '@/components/blog/blog-card'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { CollectionPageJsonLd } from '@/components/seo/json-ld'
import { Section, SectionStack } from '@/components/ui/section'
import { contentRecordIsApproved, getPayloadClient } from '@/lib/payload'
import { pageMetadata } from '@/lib/seo'

/* ISR rather than `force-dynamic`. The content behind this page changes when
   an editor publishes, not per request, so re-rendering on every hit spent a
   database round trip to produce the same HTML. Two days is deliberately far
   past how often this copy moves: the window costs one render per page rather
   than one per hour, which is what keeps this inside the hosting plan. A
   publish that needs to be live sooner is pushed with a redeploy instead of
   making every reader pay for the check. */
export const revalidate = 172_800

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blog.meta' })
  return pageMetadata({
    locale,
    path: '/blog',
    title: t('title'),
    description: t('description'),
  })
}

export default async function BlogPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('blog')

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    locale: locale as 'sr' | 'en',
    fallbackLocale: false,
    where: {
      and: [{ _status: { equals: 'published' } }, { localeReady: { not_equals: false } }],
    },
    sort: '-publishedAt',
    depth: 1,
    limit: 100,
  })

  const posts = docs
    .filter((post) => Boolean(post.slug && post.title) && contentRecordIsApproved(post))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt ?? '',
      date: p.publishedAt ?? p.createdAt,
      coverUrl:
        typeof p.coverImage === 'object' && p.coverImage ? (p.coverImage.url ?? null) : null,
      categoryTitle: typeof p.category === 'object' && p.category ? p.category.title : null,
    }))

  return (
    <>
      <CollectionPageJsonLd
        page={{
          locale,
          path: '/blog',
          name: t('hero.title'),
          description: t('meta.description'),
          itemListName: t('hero.eyebrow'),
          itemListOrder: 'ItemListOrderDescending',
          items: posts.map((post) => ({
            name: post.title,
            description: post.excerpt,
            image: post.coverUrl ?? undefined,
            path: { pathname: '/blog/[slug]', params: { slug: post.slug } },
            type: 'BlogPosting',
          })),
        }}
      />
      <SectionStack>
        <PageHero
          eyebrow={t('hero.eyebrow')}
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
        />

        <Section>
          {posts.length === 0 ? (
            <p className="text-lg text-secondary">{t('empty')}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard key={post.slug} post={post} locale={locale} />
              ))}
            </div>
          )}
        </Section>

        <CtaBand />
      </SectionStack>
    </>
  )
}
