import type { ComponentProps, ElementType } from 'react'

import { cn } from '@/lib/utils'

/**
 * The site's drawn column. Everything — header, blocks, hatch bands, footer —
 * aligns to this one boundary, so the vertical rails read as a single line
 * running the height of the page rather than as per-section decoration.
 */
export function Frame({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-frame', className)} {...props} />
}

/**
 * Crop marks: short L-shaped ticks pinned to a block's four corners, the way a
 * print proof marks its trim. They carry the top and bottom edges of a block
 * on their own — there is no full horizontal border — which is what keeps the
 * stack feeling like drawn plates instead of stacked cards.
 */
function CornerMarks({ className }: { className?: string | undefined }) {
  const arm = cn('absolute size-3.5 border-primary', className)
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-px z-10">
      <span className={cn(arm, 'top-0 left-0 border-t border-l')} />
      <span className={cn(arm, 'top-0 right-0 border-t border-r')} />
      <span className={cn(arm, 'bottom-0 left-0 border-b border-l')} />
      <span className={cn(arm, 'right-0 bottom-0 border-r border-b')} />
    </span>
  )
}

export interface BlockProps extends ComponentProps<'section'> {
  /** Landmark element to render. The plate treatment is identical either way. */
  as?: 'section' | 'header' | 'footer' | 'div'
  /** Surface tint. Alternating `page` and `panel` gives the stack its rhythm. */
  tone?: 'page' | 'panel' | 'invert'
  /** Crop marks. Turn off for a block that continues the one above it. */
  marks?: boolean
}

/** One plate in the stack: side rails, corner crop marks, optional tint. */
export function Block({
  as: Tag = 'section',
  className,
  tone = 'page',
  marks = true,
  children,
  ...props
}: BlockProps) {
  const invert = tone === 'invert'
  // The landmark tags share one prop shape; widening lets the spread type-check.
  const El = Tag as ElementType

  return (
    <El
      className={cn(
        'relative border-x border-secondary',
        tone === 'panel' && 'bg-panel',
        invert && 'border-brand bg-brand text-brand-contrast',
        className,
      )}
      {...props}
    >
      {marks ? <CornerMarks className={invert ? 'border-brand-contrast/40' : undefined} /> : null}
      {children}
    </El>
  )
}

/**
 * The ruled band that sits between two blocks. Full frame width and rail-free
 * by design: the rails stop, the hatch breathes, the next plate begins.
 */
export function Hatch({
  size = 'default',
  className,
  ...props
}: ComponentProps<'div'> & {
  /** `thin` for the strip above the header. */ size?: 'default' | 'thin'
}) {
  return (
    <div
      aria-hidden
      /* Opaque and unshrinkable: as a flex child in the page column it would
         otherwise collapse, and a sticky band has to hide what scrolls under it. */
      className={cn(
        'w-full shrink-0 border-y border-tertiary bg-page hatch',
        size === 'thin' ? 'h-6' : 'h-10 md:h-12',
        className,
      )}
      {...props}
    />
  )
}
