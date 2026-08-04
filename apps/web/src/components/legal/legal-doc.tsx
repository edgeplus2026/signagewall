import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { parseLegalMarkdown } from '@/components/legal/legal-markdown'
import { Prose } from '@/components/ui/prose'
import { Section } from '@/components/ui/section'
import { Heading } from '@/components/ui/typography'
import type { LegalKey } from '@/content/legal'
import { legalDocument } from '@/content/legal'
import { pageMetadata } from '@/lib/seo'

export type { LegalKey }

export async function legalMetadata(locale: string, doc: LegalKey): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `legal.${doc}.meta` })
  return pageMetadata({
    locale,
    path: `/${doc}`,
    title: t('title'),
    description: t('description'),
  })
}

export function LegalDoc({ doc, locale }: { doc: LegalKey; locale: string }) {
  /* Body copy comes from `content/legal.ts`, not from the message files. These
     run to ~1,800 words across nineteen clauses — prose of that length inside a
     translation JSON is unreviewable, and a lawyer cannot read it there. */
  const { title, updated, body } = parseLegalMarkdown(legalDocument(doc, locale))

  return (
    <Section innerClassName="max-w-3xl">
      {updated ? <p className="text-sm text-secondary">{updated}</p> : null}
      <Heading className="mt-3 md:text-5xl">{title}</Heading>
      <Prose className="mt-7">{body}</Prose>
    </Section>
  )
}
