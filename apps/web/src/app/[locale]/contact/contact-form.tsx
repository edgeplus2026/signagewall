'use client'

import { CheckCircle2 } from 'lucide-react'
import { useActionState, useEffect, useRef } from 'react'

import { submitContact, type ContactState } from './actions'

import { AnalyticsFormFields } from '@/components/analytics/analytics-form-fields'
import { Button } from '@/components/ui/button'
import { Field, Input, Label, Textarea } from '@/components/ui/field'
import { trackVendorEvent } from '@/lib/funnel-analytics'

interface FormLabels {
  name: string
  namePlaceholder: string
  email: string
  emailPlaceholder: string
  company: string
  companyPlaceholder: string
  message: string
  messagePlaceholder: string
  submit: string
  sending: string
  success: string
  error: string
  invalid: string
}

const INITIAL: ContactState = { status: 'idle' }

export function ContactForm({ labels }: { labels: FormLabels }) {
  const [state, action, pending] = useActionState(submitContact, INITIAL)
  const reportedSuccess = useRef(false)

  useEffect(() => {
    if (state.status === 'success' && !reportedSuccess.current) {
      reportedSuccess.current = true
      trackVendorEvent('generate_lead', { form: 'contact' })
    }
  }, [state.status])

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="font-medium">{labels.success}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <AnalyticsFormFields />
      <Field>
        <Label htmlFor="name">{labels.name}</Label>
        <Input id="name" name="name" placeholder={labels.namePlaceholder} required />
      </Field>
      <Field>
        <Label htmlFor="email">{labels.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={labels.emailPlaceholder}
          required
        />
      </Field>
      <Field>
        <Label htmlFor="company">{labels.company}</Label>
        <Input id="company" name="company" placeholder={labels.companyPlaceholder} />
      </Field>
      <Field>
        <Label htmlFor="message">{labels.message}</Label>
        <Textarea id="message" name="message" placeholder={labels.messagePlaceholder} required />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? labels.sending : labels.submit}
      </Button>

      {state.status === 'error' && <p className="text-sm text-danger">{labels.error}</p>}
      {state.status === 'invalid' && <p className="text-sm text-danger">{labels.invalid}</p>}
    </form>
  )
}
