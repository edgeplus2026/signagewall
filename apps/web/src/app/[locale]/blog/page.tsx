import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BlogCard } from '@/components/blog/blog-card'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { Section, SectionStack } from '@/components/ui/section'
import { getPayloadClient } from '@/lib/payload'
import { localeAlternates } from '@/lib/seo'

/* ISR rather than `force-dynamic`. The content behind this page changes when
   an editor publishes, not per request, so re-rendering on every hit spent a
   database round trip to produce the same HTML. An hour is well inside how
   often this copy actually moves. */
export const revalidate = 3600

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blog.meta' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: localeAlternates(locale, '/blog'),
  }
}

export default async function BlogPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('blog')

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    locale: locale as 'sr' | 'en',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    depth: 1,
    limit: 24,
  })

  const posts = docs.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? '',
    date: p.publishedAt ?? p.createdAt,
    coverUrl: typeof p.coverImage === 'object' && p.coverImage ? (p.coverImage.url ?? null) : null,
    categoryTitle: typeof p.category === 'object' && p.category ? p.category.title : null,
  }))

  return (
    <SectionStack>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

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
  )
}
