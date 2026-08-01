'use server'

export interface SubscribeState {
  status: 'idle' | 'success' | 'error' | 'invalid'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Blog subscriptions, into a Resend audience.
 *
 * The site could only capture somebody already asking for a quote. A reader who
 * is three months from buying had no way to stay in touch and no reason to come
 * back, so every post spent its audience the day it was published.
 *
 * Stored with Resend rather than in Payload because the list is only ever read
 * by the thing that sends to it, and Resend is already the sender — a
 * collection here would mean exporting it by hand every time.
 */
export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const value = formData.get('email')
  const email = typeof value === 'string' ? value.trim() : ''

  if (!EMAIL_RE.test(email)) return { status: 'invalid' }

  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID

  /* Same stance as the quote form: an unconfigured environment should not look
     broken to whoever is clicking through it. A real deploy sets both. */
  if (!apiKey || !audienceId) {
    console.warn('[subscribe] Resend audience not configured — skipping')
    return { status: 'success' }
  }

  try {
    const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    })

    /* Resend answers 409 when the address is already on the list. From the
       reader's side that is the outcome they wanted, and telling them otherwise
       only invites a second attempt. */
    if (!response.ok && response.status !== 409) {
      console.error('[subscribe] Resend responded', response.status)
      return { status: 'error' }
    }

    return { status: 'success' }
  } catch (error) {
    console.error('[subscribe] request failed', error)
    return { status: 'error' }
  }
}
