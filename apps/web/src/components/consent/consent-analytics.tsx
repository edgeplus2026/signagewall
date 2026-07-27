'use client'

import Script from 'next/script'
import { useTranslations } from 'next-intl'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

const KEY = 'edge-cookie-consent'
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

type Consent = 'granted' | 'denied' | null

// A tiny external store so consent is read via useSyncExternalStore (SSR-safe, and
// no setState-in-effect). Same-tab writes notify listeners manually.
const listeners = new Set<() => void>()

function readConsent(): Consent {
  const v = window.localStorage.getItem(KEY)
  return v === 'granted' || v === 'denied' ? v : null
}

function setConsent(value: Exclude<Consent, null>) {
  window.localStorage.setItem(KEY, value)
  listeners.forEach((l) => {
    l()
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function ConsentAnalytics() {
  const t = useTranslations('common')
  const consent = useSyncExternalStore<Consent>(subscribe, readConsent, () => null)

  return (
    <>
      {consent === 'granted' && GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      ) : null}

      {consent === null ? (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-secondary bg-panel-raised p-5 shadow-xl shadow-black/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-secondary">
              {t('cookie.message')}{' '}
              <Link href="/cookies" className="text-primary underline underline-offset-4">
                {t('cookie.more')}
              </Link>
            </p>
            <div className="flex shrink-0 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConsent('denied')
                }}
              >
                {t('cookie.decline')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setConsent('granted')
                }}
              >
                {t('cookie.accept')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
