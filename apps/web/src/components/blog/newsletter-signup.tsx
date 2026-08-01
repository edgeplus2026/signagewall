'use client'

import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { subscribe, type SubscribeState } from '@/components/blog/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Link } from '@/i18n/navigation'

const INITIAL: SubscribeState = { status: 'idle' }

/**
 * The one ask at the end of a post.
 *
 * Deliberately a single field: this sits where the reader has just finished
 * something and is deciding whether to stay, and a form that asks for a name
 * and a company at that moment reads like a sales gate. An address is enough to
 * write to them later, which is the whole point.
 */
export function NewsletterSignup() {
  const t = useTranslations('blog.subscribe')
  const [state, action, pending] = useActionState(subscribe, INITIAL)

  return (
    <aside className="border border-secondary bg-panel-raised p-6 sm:p-8">
      {state.status === 'success' ? (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <p className="text-sm text-secondary">{t('success')}</p>
        </div>
      ) : (
        <>
          <h2 className="font-heading text-xl font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-2 text-sm text-secondary">{t('body')}</p>

          <form action={action} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              className="sm:flex-1"
            />
            <Button type="submit" disabled={pending} className="shrink-0">
              {pending ? t('pending') : t('cta')}
            </Button>
          </form>

          {state.status === 'invalid' || state.status === 'error' ? (
            <p className="mt-3 text-sm text-danger">
              {state.status === 'invalid' ? t('invalid') : t('error')}
            </p>
          ) : null}

          <p className="mt-3 text-xs text-secondary">
            {t('privacy')}{' '}
            <Link href="/privacy" className="underline underline-offset-4">
              {t('privacyLink')}
            </Link>
          </p>
        </>
      )}
    </aside>
  )
}
