'use client'

import { useLocale } from 'next-intl'
import { useEffect, useRef } from 'react'

import { getAnalyticsContext } from '@/lib/funnel-analytics'

export function AnalyticsFormFields() {
  const locale = useLocale()
  const anonymousId = useRef<HTMLInputElement>(null)
  const acquisitionToken = useRef<HTMLInputElement>(null)
  const analyticsConsent = useRef<HTMLInputElement>(null)
  const submissionId = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const context = getAnalyticsContext(locale)
    if (anonymousId.current) anonymousId.current.value = context.anonymousId
    if (acquisitionToken.current) acquisitionToken.current.value = context.acquisitionToken
    if (analyticsConsent.current) analyticsConsent.current.value = String(context.analyticsConsent)
    if (submissionId.current && !submissionId.current.value) {
      submissionId.current.value = crypto.randomUUID()
    }
  }, [locale])

  return (
    <>
      <input ref={anonymousId} type="hidden" name="anonymousId" />
      <input ref={acquisitionToken} type="hidden" name="acquisitionToken" />
      <input ref={analyticsConsent} type="hidden" name="analyticsConsent" />
      <input ref={submissionId} type="hidden" name="submissionId" />
      <div className="absolute -left-[10000px]" aria-hidden="true">
        <label htmlFor="company-website">Website</label>
        <input id="company-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
    </>
  )
}
