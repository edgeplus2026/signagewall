import type { FunnelOverview } from '@/features/analytics/types/analytics.types'
import { api } from '@/lib/axios'

const ACQUISITION_KEY = 'signagewall-cms-acquisition'

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export const analyticsApi = {
  acquisitionToken: (incoming?: string): string => {
    if (incoming) {
      window.localStorage.setItem(ACQUISITION_KEY, incoming)
      return incoming
    }
    const stored = window.localStorage.getItem(ACQUISITION_KEY)
    if (stored) return stored

    const anonymousId = crypto.randomUUID()
    const touch = {
      source: 'direct',
      medium: 'none',
      landingPath: '/register',
      occurredAt: new Date().toISOString(),
    }
    const token = encode({
      version: 1,
      anonymousId,
      firstTouch: touch,
      lastTouch: touch,
      analyticsConsent: false,
    })
    window.localStorage.setItem(ACQUISITION_KEY, token)
    return token
  },

  overview: async (from: string, to: string): Promise<FunnelOverview> => {
    const { data } = await api.get<FunnelOverview>('/analytics/admin/funnel', {
      params: { from, to, recentLimit: 30 },
    })
    return data
  },

  registrationStarted: async (acquisitionToken: string): Promise<void> => {
    let anonymousId: string = crypto.randomUUID()
    try {
      const payload = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(
            atob(acquisitionToken.replaceAll('-', '+').replaceAll('_', '/')),
            (character) => character.charCodeAt(0),
          ),
        ),
      ) as { anonymousId?: string; analyticsConsent?: boolean }
      anonymousId = payload.anonymousId ?? anonymousId
      await api.post('/analytics/events', {
        eventName: 'registration_started',
        anonymousId,
        acquisitionToken,
        analyticsConsent: payload.analyticsConsent === true,
        properties: { location: '/register' },
      })
    } catch {
      await api.post('/analytics/events', {
        eventName: 'registration_started',
        anonymousId,
        properties: { location: '/register' },
      })
    }
  },
}
