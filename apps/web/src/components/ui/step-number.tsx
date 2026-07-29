import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * The big numeral that heads a step card.
 *
 * Four places drew this by hand and three of them ghosted it to `text-primary/25`
 * while the industry pages set it in coral — the same device reading two
 * different ways depending on which page you were on. It is coral now:
 * a large numeral is exactly the "graphic weight" the accent token is reserved
 * for, and at 36px+ it clears the 3:1 large-text bar (3.40:1 on the cream page).
 *
 * `index` is zero-based; the numeral is 1-based and zero-padded.
 */
export function StepNumber({
  index,
  className,
  ...props
}: ComponentProps<'span'> & { index: number }) {
  return (
    <span
      className={cn(
        'font-heading text-5xl leading-none font-semibold tracking-tight text-accent tabular-nums',
        className,
      )}
      {...props}
    >
      {String(index + 1).padStart(2, '0')}
    </span>
  )
}
