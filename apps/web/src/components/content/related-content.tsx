import type { ReactNode } from 'react'
import { useId } from 'react'

import { Eyebrow, Title } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

export interface RelatedContentProps {
  title: string
  children: ReactNode
  eyebrow?: string | undefined
  description?: string | undefined
  action?: ReactNode | undefined
  className?: string | undefined
  gridClassName?: string | undefined
}

/**
 * Shared heading and grid shell for related blog, solution and app cards. Card
 * selection remains editorial and belongs to the caller.
 */
export function RelatedContent({
  title,
  children,
  eyebrow,
  description,
  action,
  className,
  gridClassName,
}: RelatedContentProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Title id={headingId} className={eyebrow ? 'mt-5' : undefined}>
            {title}
          </Title>
          {description ? <p className="mt-5 text-lg text-secondary">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3', gridClassName)}>
        {children}
      </div>
    </section>
  )
}
