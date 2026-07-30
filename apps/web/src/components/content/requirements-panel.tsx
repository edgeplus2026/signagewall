import type { ReactNode } from 'react'
import { useId } from 'react'

import { Card } from '@/components/ui/card'
import { Title } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

export interface ContentRequirement {
  label: string
  value: ReactNode
  detail?: ReactNode | undefined
}

export interface RequirementsPanelProps {
  title: string
  items: readonly ContentRequirement[]
  intro?: ReactNode | undefined
  className?: string | undefined
}

/** Product requirements and limitations presented as facts, not buried in copy. */
export function RequirementsPanel({ title, items, intro, className }: RequirementsPanelProps) {
  const headingId = useId()
  if (items.length === 0) return null

  return (
    <section aria-labelledby={headingId}>
      <Card className={className}>
        <Title id={headingId} className="text-2xl md:text-3xl">
          {title}
        </Title>
        {intro ? (
          <div className="mt-4 max-w-2xl text-sm text-pretty text-secondary">{intro}</div>
        ) : null}
        <dl className={cn('mt-8 grid gap-px border border-secondary bg-rule sm:grid-cols-2')}>
          {items.map((item) => (
            <div key={item.label} className="bg-page p-5">
              <dt className="text-xs font-semibold tracking-[0.12em] text-secondary uppercase">
                {item.label}
              </dt>
              <dd className="mt-2 font-heading font-semibold tracking-tight text-primary">
                {item.value}
              </dd>
              {item.detail ? (
                <dd className="mt-2 text-sm leading-relaxed text-secondary">{item.detail}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      </Card>
    </section>
  )
}
