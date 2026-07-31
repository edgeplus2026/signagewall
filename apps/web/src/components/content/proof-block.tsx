import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useId } from 'react'

import { Card } from '@/components/ui/card'
import { Eyebrow, Title } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

export interface ProofSource {
  label: string
  url?: string | undefined
}

export interface ProofBlockProps {
  title: string
  body: ReactNode
  eyebrow?: string | undefined
  /** A concrete number or short result that should lead the evidence block. */
  metric?: ReactNode | undefined
  metricLabel?: string | undefined
  source?: ProofSource | undefined
  className?: string | undefined
}

/**
 * Evidence, calculation or sourced example. It deliberately does not invent a
 * citation: source is optional, but when supplied it remains visible beside the
 * claim instead of living only in metadata.
 */
export function ProofBlock({
  title,
  body,
  eyebrow,
  metric,
  metricLabel,
  source,
  className,
}: ProofBlockProps) {
  const headingId = useId()

  return (
    <aside aria-labelledby={headingId}>
      <Card className={cn('border-l-2 border-l-accent', className)}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Title id={headingId} className={cn('text-2xl md:text-3xl', eyebrow && 'mt-4')}>
          {title}
        </Title>
        {metric ? (
          <p className="mt-7 font-heading text-4xl font-semibold tracking-tight text-primary">
            {metric}
            {metricLabel ? (
              <span className="mt-1 block font-sans text-sm font-normal tracking-normal text-secondary">
                {metricLabel}
              </span>
            ) : null}
          </p>
        ) : null}
        <div className="mt-5 text-base leading-relaxed text-pretty text-secondary">{body}</div>
        {source ? (
          <p className="mt-6 border-t border-secondary pt-4 text-xs text-secondary">
            {source.url ? (
              <a
                href={source.url}
                className="inline-flex items-center gap-1 underline underline-offset-4 transition-colors hover:text-accent"
              >
                {source.label}
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            ) : (
              source.label
            )}
          </p>
        ) : null}
      </Card>
    </aside>
  )
}
