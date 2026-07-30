import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ScreenWall404 } from '@/components/brand/screen-wall-404'
import { GetInTouch } from '@/components/quote/get-in-touch'
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
  const tc = await getTranslations('common')

  return (
    <Section
      className="flex-1"
      innerClassName="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16"
    >
      <div className="flex flex-col items-start gap-5">
        <Eyebrow>404</Eyebrow>
        {/* Was a styled <p>, so the page had no H1 at all. */}
        <Heading>{t('title')}</Heading>
        <Lead className="max-w-xl">{t('body')}</Lead>
        {/* Two ways out rather than one: the address may be wrong, or the page
            may be gone and the visitor still needs an answer from a person. */}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link href="/" className={cn(buttonVariants())}>
            {t('cta')}
          </Link>
          <GetInTouch label={tc('getInTouch')} variant="outline" />
        </div>
      </div>

      <ScreenWall404 className="w-full text-primary lg:justify-self-end" />
    </Section>
  )
}
