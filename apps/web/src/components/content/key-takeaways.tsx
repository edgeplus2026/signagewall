import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useId } from 'react'

import { Card } from '@/components/ui/card'
import { Title } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

export interface KeyTakeawaysProps {
  title: string
  items: readonly ReactNode[]
  className?: string | undefined
}

/** A scannable summary for articles whose key conclusions are genuinely useful. */
export function KeyTakeaways({ title, items, className }: KeyTakeawaysProps) {
  const headingId = useId()
  if (items.length === 0) return null

  return (
    <section aria-labelledby={headingId}>
      <Card className={cn('bg-highlight', className)}>
        <Title id={headingId} className="text-2xl md:text-3xl">
          {title}
        </Title>
        <ul className="mt-6 grid gap-4">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm leading-relaxed text-secondary"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center bg-accent text-accent-contrast">
                <Check aria-hidden className="size-3.5" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
