import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Page-level H1. One per route. */
export function Heading({ className, ...props }: ComponentProps<'h1'>) {
  return (
    <h1
      className={cn(
        'font-heading text-4xl font-semibold tracking-tight text-balance md:text-6xl',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Section-level H2. Lives here rather than in each section so the display
 * scale stays in one place — six sections hand-rolling the same class string
 * is how a scale drifts.
 */
export function Title({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn(
        'font-heading text-3xl font-semibold tracking-tight text-balance md:text-5xl',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Card- and item-level H3. Every title inside a section used to be a styled
 * `<p>`, which left pages like /features reading H1 → H2 → H2 → H2 with the
 * nine feature names invisible to the outline. Anything that names a thing
 * *within* a section belongs here.
 */
export function Subtitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('font-heading text-lg font-semibold tracking-tight text-balance', className)}
      {...props}
    />
  )
}

export function Lead({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-lg text-pretty text-secondary md:text-xl', className)} {...props} />
}

/** Small ruled label above a title — the plate's caption. */
export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'font-heading text-xs font-semibold tracking-[0.18em] text-secondary uppercase',
        className,
      )}
      {...props}
    />
  )
}
