'use client'

import { CheckCircle2, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Dialog } from 'radix-ui'
import { useActionState, useEffect, useMemo, useRef, useState } from 'react'

import { AnalyticsFormFields } from '@/components/analytics/analytics-form-fields'
import { submitQuote, type QuoteState } from '@/components/quote/actions'
import { Button, buttonVariants, type ButtonProps } from '@/components/ui/button'
import { Field, Input, Label, Textarea } from '@/components/ui/field'
import { countryOptions } from '@/lib/countries'
import { trackFunnelEvent, trackVendorEvent } from '@/lib/funnel-analytics'
import { cn } from '@/lib/utils'

const INITIAL: QuoteState = { status: 'idle' }

/**
 * Every "Get in touch" on the site opens this rather than navigating to
 * /contact. The ask is a quote, and a quote needs the network size and the
 * place — questions a generic contact form does not ask and a visitor will not
 * volunteer. /contact stays for everything that is not a quote.
 */
export function GetInTouch({
  label,
  variant,
  size,
  className,
}: {
  label: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string | undefined
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) trackFunnelEvent('quote_started', { form: 'quote' })
      }}
    >
      <Dialog.Trigger className={cn(buttonVariants({ variant, size }), className)}>
        {label}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {/* Scrolls inside itself: eight fields do not fit a laptop viewport once
            the on-screen keyboard is up on mobile. */}
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[min(38rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-secondary bg-page p-6 shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:p-8">
          <QuoteForm
            onDone={() => {
              setOpen(false)
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function QuoteForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('quote')
  const locale = useLocale()
  const [state, action, pending] = useActionState(submitQuote, INITIAL)
  const countries = useMemo(() => countryOptions(locale), [locale])
  const reportedSuccess = useRef(false)

  useEffect(() => {
    if (state.status === 'success' && !reportedSuccess.current) {
      reportedSuccess.current = true
      trackVendorEvent('generate_lead', { form: 'quote' })
    }
  }, [state.status])

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-6" />
        </span>
        <Dialog.Title className="font-heading text-xl font-semibold">
          {t('successTitle')}
        </Dialog.Title>
        <Dialog.Description className="text-sm text-secondary">{t('success')}</Dialog.Description>
        <Button onClick={onDone} className="mt-2">
          {t('close')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div>
          <Dialog.Title className="font-heading text-2xl font-semibold tracking-tight">
            {t('title')}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-secondary">
            {t('subtitle')}
          </Dialog.Description>
        </div>
        <Dialog.Close
          aria-label={t('close')}
          className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center text-secondary transition-colors hover:bg-highlight hover:text-primary"
        >
          <X className="size-4.5" />
        </Dialog.Close>
      </div>

      <form action={action} className="mt-6 flex flex-col gap-5">
        <AnalyticsFormFields />
        {/* The action mails the lead; the locale tells us which language to answer in. */}
        <input type="hidden" name="locale" value={locale} />

        <Field>
          <Label htmlFor="quote-name">{t('name')}</Label>
          <Input id="quote-name" name="name" autoComplete="name" required />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <Label htmlFor="quote-email">{t('email')}</Label>
            <Input id="quote-email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field>
            <Label htmlFor="quote-phone">{t('phone')}</Label>
            <Input id="quote-phone" name="phone" type="tel" autoComplete="tel" />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <Label htmlFor="quote-screens">{t('screens')}</Label>
            {/* The one field that decides the answer — Basic or a quoted price. */}
            <Input
              id="quote-screens"
              name="screens"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              required
            />
          </Field>
          <Field>
            <Label htmlFor="quote-city">{t('city')}</Label>
            <Input id="quote-city" name="city" autoComplete="address-level2" />
          </Field>
        </div>

        <Field>
          <Label htmlFor="quote-country">{t('country')}</Label>
          <select
            id="quote-country"
            name="country"
            defaultValue=""
            autoComplete="country"
            className="h-11 w-full appearance-none border border-secondary bg-page px-3.5 text-sm transition-colors outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <option value="">{t('countryPlaceholder')}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field>
          <Label htmlFor="quote-message">{t('message')}</Label>
          <Textarea
            id="quote-message"
            name="message"
            className="min-h-28"
            placeholder={t('messagePlaceholder')}
          />
        </Field>

        {state.status === 'invalid' && <p className="text-sm text-danger">{t('invalid')}</p>}
        {state.status === 'error' && <p className="text-sm text-danger">{t('error')}</p>}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? t('sending') : t('submit')}
        </Button>
        <p className="text-center text-xs text-secondary">{t('note')}</p>
      </form>
    </>
  )
}
