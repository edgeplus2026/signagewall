import { CircleCheck, CircleX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { authApi } from '@/features/auth/api/authApi'
import { resolveAuthFormError } from '@/features/auth/lib/authFormError'

type VerifyState = 'verifying' | 'success' | 'error'

export function VerifyEmailForm() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'error')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : t('auth.verifyEmail.missingToken'),
  )
  // React 18 StrictMode mounts effects twice in dev; guard the one-shot call.
  const hasVerified = useRef(false)

  useEffect(() => {
    if (!token || hasVerified.current) {
      return
    }
    hasVerified.current = true

    authApi
      .verifyEmail({ token })
      .then(() => {
        setState('success')
      })
      .catch((error: unknown) => {
        setErrorMessage(resolveAuthFormError(error, 'auth.verifyEmail.error', t))
        setState('error')
      })
  }, [t, token])

  if (state === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="border-brand h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-secondary text-sm">{t('auth.verifyEmail.verifying')}</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col gap-6">
        <FieldGroup>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-success/10 text-success flex size-12 items-center justify-center rounded-full">
              <CircleCheck className="size-6" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-medium">{t('auth.verifyEmail.successTitle')}</h1>
              <p className="text-secondary text-sm text-balance">
                {t('auth.verifyEmail.successDescription')}
              </p>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">{t('auth.verifyEmail.goToLogin')}</Link>
          </Button>
        </FieldGroup>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-danger/10 text-danger flex size-12 items-center justify-center rounded-full">
            <CircleX className="size-6" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-medium">{t('auth.verifyEmail.errorTitle')}</h1>
            <p className="text-secondary text-sm text-balance">
              {errorMessage ?? t('auth.verifyEmail.error')}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/check-email">{t('auth.verifyEmail.requestNewLink')}</Link>
        </Button>
        <p className="text-secondary text-center text-sm">
          <Link to="/login" className="underline underline-offset-4">
            {t('auth.verifyEmail.backToLogin')}
          </Link>
        </p>
      </FieldGroup>
    </div>
  )
}
