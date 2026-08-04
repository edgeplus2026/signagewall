'use client'

import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useEffect } from 'react'

import { registrationUrl, trackFunnelEvent } from '@/lib/funnel-analytics'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173'

export function AttributionAnalytics() {
  const pathname = usePathname()
  const locale = useLocale()

  useEffect(() => {
    trackFunnelEvent('marketing_landing', { location: pathname, locale }, locale)
  }, [locale, pathname])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a')
      if (!anchor) return
      const target = new URL(anchor.href, window.location.href)
      if (target.origin !== new URL(APP_URL).origin || target.pathname !== '/register') return
      const text = anchor.textContent.trim().slice(0, 80)

      trackFunnelEvent(
        'marketing_cta_clicked',
        {
          location: window.location.pathname,
          cta: text.length > 0 ? text : 'register',
        },
        locale,
      )
      anchor.href = registrationUrl(target.toString(), locale)
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
    }
  }, [locale])

  return null
}
