'use client'

import { track } from '@vercel/analytics'

const ANONYMOUS_ID_KEY = 'signagewall-anonymous-id'
const ATTRIBUTION_KEY = 'signagewall-attribution'
const CONSENT_KEY = 'signagewall-cookie-consent'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

type ClientEvent =
  | 'marketing_landing'
  | 'marketing_cta_clicked'
  | 'quote_started'
  | 'registration_started'

interface Touch {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  clickId?: string
  landingPath?: string
  referrerDomain?: string
  locale?: string
  occurredAt?: string
}

interface StoredAttribution {
  version: 1
  firstTouch: Touch
  lastTouch: Touch
}

export interface AnalyticsContext {
  anonymousId: string
  acquisitionToken: string
  analyticsConsent: boolean
}

function currentTouch(locale?: string): Touch {
  const query = new URLSearchParams(window.location.search)
  let referrerDomain: string | undefined
  try {
    referrerDomain = document.referrer ? new URL(document.referrer).hostname : undefined
  } catch {
    referrerDomain = undefined
  }
  const clickId = query.get('gclid') ?? query.get('fbclid') ?? query.get('msclkid') ?? undefined
  const source = query.get('utm_source') ?? referrerDomain ?? 'direct'
  const medium = query.get('utm_medium') ?? (referrerDomain ? 'referral' : 'none')
  const campaign = query.get('utm_campaign')
  const term = query.get('utm_term')
  const content = query.get('utm_content')

  return {
    source,
    medium,
    ...(campaign ? { campaign } : {}),
    ...(term ? { term } : {}),
    ...(content ? { content } : {}),
    ...(clickId ? { clickId } : {}),
    landingPath: `${window.location.pathname}${window.location.search}`.slice(0, 500),
    ...(referrerDomain ? { referrerDomain } : {}),
    ...(locale ? { locale } : {}),
    occurredAt: new Date().toISOString(),
  }
}

function readAttribution(): StoredAttribution | undefined {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY)
    return raw ? (JSON.parse(raw) as StoredAttribution) : undefined
  } catch {
    return undefined
  }
}

function hasCampaignSignal(): boolean {
  const query = new URLSearchParams(window.location.search)
  return (
    ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'msclkid'].some((key) =>
      query.has(key),
    ) || Boolean(document.referrer && !document.referrer.startsWith(window.location.origin))
  )
}

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function getAnalyticsContext(locale?: string): AnalyticsContext {
  let anonymousId = window.localStorage.getItem(ANONYMOUS_ID_KEY)
  if (!anonymousId) {
    anonymousId = crypto.randomUUID()
    window.localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId)
  }

  const touch = currentTouch(locale)
  const stored = readAttribution()
  const attribution: StoredAttribution = stored
    ? {
        ...stored,
        lastTouch: hasCampaignSignal() ? touch : stored.lastTouch,
      }
    : { version: 1, firstTouch: touch, lastTouch: touch }
  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))

  const analyticsConsent = window.localStorage.getItem(CONSENT_KEY) === 'granted'
  return {
    anonymousId,
    analyticsConsent,
    acquisitionToken: encode({
      ...attribution,
      anonymousId,
      analyticsConsent,
    }),
  }
}

export function trackVendorEvent(
  eventName: string,
  properties: Record<string, string | number | boolean> = {},
): void {
  trackVercelEvent(eventName, properties)
  if (window.localStorage.getItem(CONSENT_KEY) === 'granted') {
    const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag
    gtag?.('event', eventName, properties)
  }
}

export function trackVercelEvent(
  eventName: string,
  properties: Record<string, string | number | boolean> = {},
): void {
  track(eventName, properties)
}

export function trackFunnelEvent(
  eventName: ClientEvent,
  properties: Record<string, string | number | boolean> = {},
  locale?: string,
): void {
  const context = getAnalyticsContext(locale)
  trackVendorEvent(eventName, properties)
  void fetch(`${API_URL}/analytics/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventName,
      ...context,
      properties,
    }),
    keepalive: true,
  }).catch(() => {
    // First-party collection is best-effort and must not interrupt navigation.
  })
}

export function registrationUrl(url: string, locale?: string): string {
  const target = new URL(url)
  target.searchParams.set('acquisition', getAnalyticsContext(locale).acquisitionToken)
  return target.toString()
}
