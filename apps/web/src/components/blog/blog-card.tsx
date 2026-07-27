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
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-secondary bg-panel transition-colors hover:border-primary"
    >
      <div className="aspect-[16/10] overflow-hidden bg-highlight">
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverUrl}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
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
        <p className="mt-3 font-heading text-lg leading-snug font-medium">{post.title}</p>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm text-secondary">{post.excerpt}</p>
        ) : null}
        {dateStr ? <p className="mt-4 text-xs text-secondary">{dateStr}</p> : null}
      </div>
    </Link>
  )
}
