import type { ReactNode } from 'react'

import { Reveal } from '@/components/motion/reveal'
import { Eyebrow, Title } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Optional trailing action, floated to the right edge on wide viewports. */
  action?: ReactNode
  className?: string
}

/** Consistent section intro (eyebrow + H2 + lead), revealed on scroll. */
export function SectionHeader({ eyebrow, title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between', className)}
    >
      <Reveal className="max-w-2xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Title className={eyebrow ? 'mt-5' : undefined}>{title}</Title>
        {subtitle ? <p className="mt-5 text-lg text-secondary">{subtitle}</p> : null}
      </Reveal>
      {action ? (
        <Reveal delay={100} className="shrink-0">
          {action}
        </Reveal>
      ) : null}
    </div>
  )
}
