import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'

import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'

export interface BlogCardData {
  slug: string
  title: string
  excerpt: string
  date: string | null
  coverUrl: string | null
  categoryTitle: string | null
}

export function BlogCard({ post, locale }: { post: BlogCardData; locale: string }) {
  const dateStr = post.date
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(post.date))
    : ''

  return (
    <Link
      href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }}
      className="group flex flex-col overflow-hidden border border-secondary bg-panel transition-colors hover:border-accent"
    >
      {/* `relative` so the fill image has something to size against. */}
      <div className="relative aspect-[16/10] overflow-hidden bg-highlight">
        {post.coverUrl ? (
          /* alt="" on purpose: the title sits right below, so announcing the
             picture as well would read the card out twice. */
          <Image
            src={post.coverUrl}
            alt=""
            fill
            /* Three columns on desktop, two on tablet, one on a phone — without
               this every card downloads a full-width image. */
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="size-full"
            style={{
              backgroundImage: 'radial-gradient(var(--border-secondary) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {post.categoryTitle ? <Badge className="self-start">{post.categoryTitle}</Badge> : null}
        {/* Post titles are the listing's headings, not body copy. h2 rather
            than h3: the listing has no section header above the grid, so h3
            here would skip a level straight from the page h1. */}
        <h2 className="mt-3 font-heading text-lg leading-snug font-medium">{post.title}</h2>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm text-secondary">{post.excerpt}</p>
        ) : null}
        {/* Date and arrow share the footer row, pinned to the bottom so a short
            excerpt doesn't leave the affordance floating mid-card. The arrow is
            always drawn — a card that only admits it is a link on hover reads as
            decoration until you happen to touch it. */}
        <div className="mt-auto flex items-center justify-between gap-4 pt-4">
          <span className="text-xs text-secondary">{dateStr}</span>
          <ArrowUpRight className="size-4 shrink-0 text-secondary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
        </div>
      </div>
    </Link>
  )
}
