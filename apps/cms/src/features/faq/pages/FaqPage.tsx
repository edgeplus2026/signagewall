import { ChevronDownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FaqItem {
  question: string
  answer: string
}

interface FaqCategory {
  title: string
  items: FaqItem[]
}

const CATEGORY_ORDER = [
  'general',
  'content',
  'organizations',
  'users',
  'account',
  'support',
] as const

export default function FaqPage() {
  const { t } = useTranslation()
  const categories = t('faq.categories', { returnObjects: true }) as Record<string, FaqCategory>

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-primary text-xl font-medium tracking-tight">{t('faq.title')}</h1>
        <p className="text-secondary text-sm">{t('faq.description')}</p>
      </div>

      <div className="flex flex-col gap-7">
        {CATEGORY_ORDER.map((key) => {
          const category = categories[key]
          if (!category) return null

          return (
            <section key={key} className="flex flex-col gap-2.5">
              <h2 className="text-secondary text-[13px] font-medium">{category.title}</h2>
              <div className="divide-quaternary bg-panel divide-y overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--border-quaternary)]">
                {category.items.map((item) => (
                  <details key={item.question} className="group">
                    <summary className="text-primary flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <ChevronDownIcon className="text-secondary size-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="text-secondary px-4 pb-4 text-[13px] leading-relaxed">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
