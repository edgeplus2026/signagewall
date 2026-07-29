import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Eyebrow, Heading, Lead } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/* A 404 that gets indexed is a 404 that competes with real pages. Next serves
   the correct status code; this keeps it out of the index either way. */
export const metadata: Metadata = {
  title: '404',
  robots: { index: false, follow: true },
}

export default async function NotFound() {
  const t = await getTranslations('common.notFound')

  return (
    <Section className="flex-1" innerClassName="flex flex-col items-start gap-5">
      <Eyebrow>404</Eyebrow>
      {/* Was a styled <p>, so the page had no H1 at all. */}
      <Heading>{t('title')}</Heading>
      <Lead className="max-w-xl">{t('body')}</Lead>
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
        {t('cta')}
      </Link>
    </Section>
  )
}
