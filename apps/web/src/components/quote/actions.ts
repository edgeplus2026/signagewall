'use server'

import { countryName } from '@/lib/countries'

export interface QuoteState {
  status: 'idle' | 'success' | 'error' | 'invalid'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The quote request behind every "Get in touch" button.
 *
 * Same transport as the contact form (Resend, one notification email) rather
 * than a new collection: nothing on this site reads these back, and a lead that
 * lands in an inbox is a lead somebody answers. If that changes, this is the one
 * place to add the write.
 */
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

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM
  const to = process.env.CONTACT_NOTIFY_TO ?? process.env.MAIL_SUPPORT_TO

  // Not configured (e.g. local dev without secrets): don't fail the UX — log and
  // report success so the form can be exercised. A real deploy sets these envs.
  if (!apiKey || !from || !to) {
    console.warn('[quote] Resend not configured — skipping email send')
    return { status: 'success' }
  }

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    `Screens: ${screens}`,
    `City: ${city || '—'}`,
    `Country: ${country ? countryName(country, 'en') : '—'}`,
    `Site language: ${locale}`,
    '',
    'Message:',
    message || '—',
  ]

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Quote request — ${name} (${screens} screens)`,
        text: lines.join('\n'),
      }),
    })
    if (!res.ok) {
      throw new Error(`Resend responded ${res.status.toString()}`)
    }
    return { status: 'success' }
  } catch (err) {
    console.error('[quote] send failed', err)
    return { status: 'error' }
  }
}
