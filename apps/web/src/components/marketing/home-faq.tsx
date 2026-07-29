import { getTranslations } from 'next-intl/server'

import { FaqJsonLd } from '@/components/seo/json-ld'
import { Faq } from '@/components/ui/faq'
import { Section } from '@/components/ui/section'
import { Title } from '@/components/ui/typography'
import { formattedPrice, TRIAL_DAYS } from '@/lib/pricing'

/**
 * Eight questions, answered properly.
 *
 * The site had FAQ blocks of three or four one-line answers and none on the
 * home page at all. These are written the way they get asked in a sales call,
 * at a length worth reading — which is also the shape an AI assistant will
 * quote when someone asks it what digital signage costs.
 */
export async function HomeFaq({ locale }: { locale: string }) {
  const t = await getTranslations('home.faq')
  const values = { price: formattedPrice(locale), trialDays: TRIAL_DAYS }
  const items = (t.raw('items') as { q: string; a: string }[]).map((_, i) => ({
    q: t(`items.${i.toString()}.q`, values),
    a: t(`items.${i.toString()}.a`, values),
  }))

  return (
    <Section innerClassName="max-w-3xl">
      {/* Emitted only because the same questions render right below. */}
      <FaqJsonLd items={items} />
      <Title className="text-2xl md:text-3xl">{t('title')}</Title>
      <div className="mt-10">
        <Faq items={items} />
      </div>
    </Section>
  )
}
