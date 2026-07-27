import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Prose } from '@/components/ui/prose'
import { Section } from '@/components/ui/section'
import { Heading } from '@/components/ui/typography'

export type LegalKey = 'privacy' | 'terms' | 'cookies'

export async function legalMetadata(locale: string, doc: LegalKey): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `legal.${doc}.meta` })
  return { title: t('title'), description: t('description') }
}

export async function LegalDoc({ doc }: { doc: LegalKey }) {
  const t = await getTranslations(`legal.${doc}`)
  const sections = t.raw('sections') as { heading: string; body: string }[]

  return (
    <Section innerClassName="max-w-3xl">
      <p className="text-sm text-secondary">{t('updated')}</p>
      <Heading className="mt-3 md:text-5xl">{t('title')}</Heading>
      <Prose className="mt-7">
        <p className="text-lg text-primary">{t('intro')}</p>
        {sections.map((s) => (
          <div key={s.heading}>
            <h2>{s.heading}</h2>
            <p>{s.body}</p>
          </div>
        ))}
        <p className="mt-10 border-t border-secondary pt-6 text-xs">{t('disclaimer')}</p>
      </Prose>
    </Section>
  )
}
