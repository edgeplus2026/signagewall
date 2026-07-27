import { RichText } from '@payloadcms/richtext-lexical/react'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { Badge } from '@/components/ui/badge'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

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
  const meta: Metadata = { title: post.title }
  if (post.excerpt) meta.description = post.excerpt
  return meta
}

export default async function PostPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('blog')
  const post = await fetchPost(locale, slug)
  if (!post) notFound()

  const category = typeof post.category === 'object' ? post.category : null
  const author = typeof post.author === 'object' ? post.author : null
  const cover = typeof post.coverImage === 'object' ? post.coverImage : null
  const date = post.publishedAt ?? post.createdAt
  const dateStr = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(date))

  return (
    <SectionStack>
      <Section innerClassName="py-14 md:py-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          {t('back')}
        </Link>
        <div className="mt-8 max-w-3xl">
          {category ? <Badge>{category.title}</Badge> : null}
          <Title className="mt-4">{post.title}</Title>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary">
            {author?.name ? <span>{author.name}</span> : null}
            {author?.name ? <span aria-hidden>·</span> : null}
            <span>{dateStr}</span>
          </div>
        </div>
        {cover?.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover.url}
            alt={cover.alt ?? ''}
            className="mt-10 aspect-video w-full border border-secondary object-cover"
          />
        ) : null}
      </Section>

      <Section innerClassName="max-w-3xl">
        <Prose>{post.content ? <RichText data={post.content} /> : null}</Prose>
      </Section>

      <CtaBand />
    </SectionStack>
  )
}
