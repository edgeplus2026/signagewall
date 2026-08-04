'use server'

import { recordLead } from '@/lib/server-funnel'

export interface ContactState {
  status: 'idle' | 'success' | 'error' | 'invalid'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const field = (key: string): string => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
  }
  const name = field('name')
  const email = field('email')
  const company = field('company')
  const message = field('message')

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 5) {
    return { status: 'invalid' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM
  const to = process.env.CONTACT_NOTIFY_TO ?? process.env.MAIL_SUPPORT_TO

  // Not configured (e.g. local dev without secrets): don't fail the UX — log and
  // report success so the form can be exercised. A real deploy sets these envs.
  if (!apiKey || !from || !to) {
    console.warn('[contact] Resend not configured — skipping email send')
    await recordLead(formData, 'contact')
    return { status: 'success' }
  }

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
        subject: `Nova poruka sa sajta — ${name}`,
        text: `Ime: ${name}\nEmail: ${email}\nKompanija: ${company || '—'}\n\nPoruka:\n${message}`,
      }),
    })
    if (!res.ok) {
      throw new Error(`Resend responded ${res.status.toString()}`)
    }
    await recordLead(formData, 'contact')
    return { status: 'success' }
  } catch (err) {
    console.error('[contact] send failed', err)
    return { status: 'error' }
  }
}
