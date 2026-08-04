import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ContactForm } from './contact-form'

import { PageHero } from '@/components/marketing/page-hero'
import { Card } from '@/components/ui/card'
import { Section, SectionStack } from '@/components/ui/section'
import { Title } from '@/components/ui/typography'
import { pageMetadata } from '@/lib/seo'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact.meta' })
  return pageMetadata({
    locale,
    path: '/contact',
    title: t('title'),
    description: t('description'),
  })
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('contact')
  const email = t('info.email')

  return (
    <SectionStack>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Section innerClassName="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <Title className="text-2xl md:text-3xl">{t('info.title')}</Title>
          <p className="mt-5 text-lg text-secondary">{t('info.body')}</p>
          <a
            href={`mailto:${email}`}
            className="group mt-8 inline-flex items-center gap-4 border border-secondary p-4 text-primary transition-colors hover:border-accent"
          >
            <span className="flex size-11 items-center justify-center bg-brand text-brand-contrast transition-colors group-hover:bg-accent group-hover:text-accent-contrast">
              <Mail className="size-5" />
            </span>
            <span>
              <span className="block text-xs tracking-widest text-secondary uppercase">
                {t('info.emailLabel')}
              </span>
              <span className="mt-0.5 block font-medium">{email}</span>
            </span>
          </a>
          <p className="mt-6 text-sm text-secondary">{t('info.responseTime')}</p>
        </div>

        <Card>
          <ContactForm
            labels={{
              name: t('form.name'),
              namePlaceholder: t('form.namePlaceholder'),
              email: t('form.email'),
              emailPlaceholder: t('form.emailPlaceholder'),
              company: t('form.company'),
              companyPlaceholder: t('form.companyPlaceholder'),
              message: t('form.message'),
              messagePlaceholder: t('form.messagePlaceholder'),
              submit: t('form.submit'),
              sending: t('form.sending'),
              success: t('form.success'),
              error: t('form.error'),
              invalid: t('form.invalid'),
            }}
          />
        </Card>
      </Section>
    </SectionStack>
  )
}
