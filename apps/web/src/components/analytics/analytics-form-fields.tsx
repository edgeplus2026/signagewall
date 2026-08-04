'use client'

import { useLocale } from 'next-intl'
import { useEffect, useRef } from 'react'

import { getAnalyticsContext } from '@/lib/funnel-analytics'

export function AnalyticsFormFields() {
  const locale = useLocale()
  const anonymousId = useRef<HTMLInputElement>(null)
  const acquisitionToken = useRef<HTMLInputElement>(null)
  const analyticsConsent = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const context = getAnalyticsContext(locale)
    if (anonymousId.current) anonymousId.current.value = context.anonymousId
    if (acquisitionToken.current) acquisitionToken.current.value = context.acquisitionToken
    if (analyticsConsent.current) analyticsConsent.current.value = String(context.analyticsConsent)
  }, [locale])

  return (
    <>
      <input ref={anonymousId} type="hidden" name="anonymousId" />
      <input ref={acquisitionToken} type="hidden" name="acquisitionToken" />
      <input ref={analyticsConsent} type="hidden" name="analyticsConsent" />
    </>
  )
}
