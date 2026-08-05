'use server'

import { createCrmLead } from '@/lib/server-crm'

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

  try {
    await createCrmLead(formData, {
      type: 'contact',
      name,
      email,
      ...(company ? { company } : {}),
      message,
    })
    return { status: 'success' }
  } catch (error) {
    console.error('[contact] CRM intake failed', error)
    return { status: 'error' }
  }
}
