import { useId } from 'react'

import { FaqJsonLd } from '@/components/seo/json-ld'
import { Faq } from '@/components/ui/faq'
import { Title } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

export interface ContentFaqItem {
  q: string
  a: string
}

export interface ContentFaqProps {
  title: string
  items: readonly ContentFaqItem[]
  /**
   * Disable only when the route emits the same FAQ graph elsewhere. Structured
   * data defaults on so it always mirrors the visible questions.
   */
  includeStructuredData?: boolean | undefined
  className?: string | undefined
}

/** Visible FAQ and, by default, its matching FAQPage graph from one data array. */
export function ContentFaq({
  title,
  items,
  includeStructuredData = true,
  className,
}: ContentFaqProps) {
  const headingId = useId()
  if (items.length === 0) return null

  const faqItems = items.map((item) => ({ q: item.q, a: item.a }))

  return (
    <>
      {includeStructuredData ? <FaqJsonLd items={faqItems} /> : null}
      <section aria-labelledby={headingId} className={cn('max-w-3xl', className)}>
        <Title id={headingId} className="text-2xl md:text-3xl">
          {title}
        </Title>
        <div className="mt-10">
          <Faq items={faqItems} />
        </div>
      </section>
    </>
  )
}
