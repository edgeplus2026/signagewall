import { MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Field, FieldGroup } from '@/components/ui/field'
import { authApi } from '@/features/auth/api/authApi'
import { resolveAuthFormError } from '@/features/auth/lib/authFormError'

const RESEND_COOLDOWN_SECONDS = 30

export function CheckEmailCard() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }
    const timer = setTimeout(() => {
      setCooldown((value) => value - 1)
    }, 1000)
    return () => {
      clearTimeout(timer)
    }
  }, [cooldown])

  const handleResend = async () => {
    if (!email || isResending || cooldown > 0) {
      return
    }

    setIsResending(true)
    setResendMessage(null)
    setResendError(null)

    try {
      await authApi.resendVerification({ email })
      setResendMessage(t('auth.verifyEmail.resent'))
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setResendError(resolveAuthFormError(error, 'auth.verifyEmail.resendError', t))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-brand/10 text-brand flex size-12 items-center justify-center rounded-full">
            <MailCheck className="size-6" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-medium">{t('auth.verifyEmail.checkEmailTitle')}</h1>
            <p className="text-secondary text-sm text-balance">
              {email
                ? t('auth.verifyEmail.checkEmailDescription', { email })
                : t('auth.verifyEmail.checkEmailDescriptionNoEmail')}
            </p>
          </div>
        </div>
        {email ? (
          <Field>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isResending || cooldown > 0}
              onClick={() => {
                void handleResend()
              }}
            >
              {cooldown > 0
                ? t('auth.verifyEmail.resendCooldown', { seconds: cooldown })
                : t('auth.verifyEmail.resend')}
            </Button>
            {resendMessage ? (
              <p className="text-secondary text-center text-sm">{resendMessage}</p>
            ) : null}
            {resendError ? <p className="text-danger text-center text-sm">{resendError}</p> : null}
          </Field>
        ) : null}
        <p className="text-secondary text-center text-sm">
          <Link to="/login" className="underline underline-offset-4">
            {t('auth.verifyEmail.backToLogin')}
          </Link>
        </p>
      </FieldGroup>
    </div>
  )
}
