import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { LegalDoc, legalMetadata } from '@/components/legal/legal-doc'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return legalMetadata(locale, 'cookies')
}

export default async function CookiesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LegalDoc doc="cookies" />
}
