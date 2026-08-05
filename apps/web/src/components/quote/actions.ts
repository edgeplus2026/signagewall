'use server'

import { createCrmLead } from '@/lib/server-crm'

export interface QuoteState {
  status: 'idle' | 'success' | 'error' | 'invalid'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Backend writes the CRM row first, then sends the founder email best-effort. */
export async function submitQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const field = (key: string): string => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
  }
  const name = field('name')
  const email = field('email')
  const phone = field('phone')
  const screens = field('screens')
  const city = field('city')
  const country = field('country')
  const message = field('message')
  const locale = field('locale') || 'en'

  if (name.length < 2 || !EMAIL_RE.test(email) || screens.length === 0) {
    return { status: 'invalid' }
  }

  try {
    await createCrmLead(formData, {
      type: 'quote',
      name,
      email,
      ...(phone ? { phone } : {}),
      message: message || `Quote request for ${screens} screens`,
      locale,
      screenQuantity: Number(screens),
      ...(city ? { city } : {}),
      ...(country ? { country } : {}),
    })
    return { status: 'success' }
  } catch (error) {
    console.error('[quote] CRM intake failed', error)
    return { status: 'error' }
  }
}
