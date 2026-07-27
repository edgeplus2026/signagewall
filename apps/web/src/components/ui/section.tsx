import { Children, Fragment, type ReactNode } from 'react'

import { Block, Hatch, type BlockProps } from '@/components/ui/block'
import { Container } from '@/components/ui/container'
import { cn } from '@/lib/utils'

interface SectionProps extends BlockProps {
  /** Overrides for the gutter and vertical rhythm, which live on the inner column. */
  innerClassName?: string
}

/**
 * The one section wrapper on the site. Every plate goes through here: rails and
 * crop marks come from the block, gutter and vertical rhythm from the column.
 *
 * Sections deliberately do not accept their own borders or padding — the moment
 * a page hand-rolls either, its edges stop lining up with the rest of the stack.
 */
export function Section({ className, innerClassName, children, ...props }: SectionProps) {
  return (
    <Block className={className} {...props}>
      <Container className={cn('py-20 md:py-28', innerClassName)}>{children}</Container>
    </Block>
  )
}

/**
 * Stacks sections and rules a hatch band into every seam between them, so the
 * separators can never be forgotten on one page and doubled on another.
 */
export function SectionStack({ children }: { children: ReactNode }) {
  const sections = Children.toArray(children)

  return (
    <>
      {sections.map((section, i) => (
        <Fragment key={i}>
          {i > 0 ? <Hatch /> : null}
          {section}
        </Fragment>
      ))}
      {/* On a page too short to fill the viewport the footer is pushed down by
          `main`'s flex grow; this rail-only plate absorbs that slack so the
          side lines run unbroken to the bottom. Zero-height when unneeded. */}
      <Block marks={false} className="flex-1" />
    </>
  )
}
