import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DateInput = Date | number | string

export interface ContentMetaLabels {
  /** Optional, localised prefix. Omit it to show only the author's name. */
  author?: string | undefined
  /** Accessible label for the publication date. */
  published?: string | undefined
  /** Optional, visible localised prefix for the revision date. */
  updated?: string | undefined
}

export interface ContentMetaProps {
  locale: string
  author?: ReactNode | undefined
  publishedAt?: DateInput | null | undefined
  updatedAt?: DateInput | null | undefined
  /** Pass the fully localised value, such as "7 min read". */
  readingTime?: ReactNode | undefined
  labels?: ContentMetaLabels | undefined
  className?: string | undefined
}

function normaliseDate(value: DateInput | null | undefined, locale: string) {
  if (value === null || value === undefined) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.valueOf())) return null

  return {
    iso: date.toISOString(),
    text: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date),
  }
}

/**
 * Compact byline/date/reading-time row for long-form content. Labels stay in
 * the caller because they are editorial UI copy and must come from next-intl.
 */
export function ContentMeta({
  locale,
  author,
  publishedAt,
  updatedAt,
  readingTime,
  labels,
  className,
}: ContentMetaProps) {
  const published = normaliseDate(publishedAt, locale)
  const updated = normaliseDate(updatedAt, locale)
  const showUpdated = updated && updated.iso !== published?.iso

  const parts: ReactNode[] = []

  if (author) {
    parts.push(
      <span key="author">
        {labels?.author ? <span>{labels.author} </span> : null}
        {author}
      </span>,
    )
  }

  if (published) {
    parts.push(
      <time key="published" dateTime={published.iso} aria-label={labels?.published}>
        {published.text}
      </time>,
    )
  }

  if (showUpdated) {
    parts.push(
      <span key="updated">
        {labels?.updated ? <span>{labels.updated} </span> : null}
        <time dateTime={updated.iso}>{updated.text}</time>
      </span>,
    )
  }

  if (readingTime) parts.push(<span key="reading-time">{readingTime}</span>)
  if (parts.length === 0) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary',
        className,
      )}
    >
      {parts.map((part, index) => (
        <span key={index} className="contents">
          {index > 0 ? <span aria-hidden>·</span> : null}
          {part}
        </span>
      ))}
    </div>
  )
}
