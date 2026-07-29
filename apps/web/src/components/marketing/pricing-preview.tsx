import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/motion/reveal'
import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Eyebrow, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { formattedPrice } from '@/lib/pricing'
import { cn } from '@/lib/utils'

/**
 * The price, on the home page.
 *
 * Publishing it is the differentiator, so hiding it one click away wastes it —
 * and "how much does it cost" is the question a visitor arrives with. The
 * second link goes to the Yodeck comparison, because the visitor who is
 * price-shopping is already comparing.
 */
export async function PricingPreview({ locale }: { locale: string }) {
  const t = await getTranslations('home.pricingPreview')
  const values = { price: formattedPrice(locale) }

  return (
    <Section tone="panel" innerClassName="max-w-3xl">
      <Reveal className="flex flex-col items-start gap-5">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <Title className="text-3xl md:text-5xl">{t('title', values)}</Title>
        <p className="max-w-xl text-lg text-secondary">{t('body')}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/pricing" className={cn(buttonVariants({ size: 'lg' }))}>
            {t('cta')}
          </Link>
          <Link
            href={{ pathname: '/alternatives/[competitor]', params: { competitor: 'yodeck' } }}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            {t('ctaSecondary')}
          </Link>
        </div>
      </Reveal>
    </Section>
  )
}
