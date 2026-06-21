import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authApi } from '@/features/auth/api/authApi'
import { resolveAuthFormError } from '@/features/auth/lib/authFormError'
import {
  createForgotPasswordSchema,
  type ForgotPasswordSchema,
} from '@/features/auth/schemas/authSchemas'

export function ForgotPasswordForm() {
  const { t } = useTranslation()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const forgotPasswordSchema = useMemo(() => createForgotPasswordSchema(t), [t])

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const sendResetLink = async (email: string) => {
    await authApi.forgotPassword({ email })
  }

  const onSubmit = handleSubmit(async (data) => {
    clearErrors('email')

    try {
      await sendResetLink(data.email)
      setSubmittedEmail(data.email)
    } catch (error) {
      setError('email', {
        message: resolveAuthFormError(error, 'auth.forgotPassword.error', t),
      })
    }
  })

  const handleResend = async () => {
    if (!submittedEmail || isResending) {
      return
    }

    setIsResending(true)
    setResendMessage(null)
    setResendError(null)

    try {
      await sendResetLink(submittedEmail)
      setResendMessage(t('auth.forgotPassword.resendSuccess'))
    } catch (error) {
      setResendError(resolveAuthFormError(error, 'auth.forgotPassword.resendError', t))
    } finally {
      setIsResending(false)
    }
  }

  if (submittedEmail) {
    return (
      <div className="flex flex-col gap-6">
        <FieldGroup>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-brand/10 text-brand flex size-12 items-center justify-center rounded-full">
              <MailCheck className="size-6" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-medium">{t('auth.forgotPassword.successTitle')}</h1>
              <p className="text-secondary text-sm text-balance">
                {t('auth.forgotPassword.successDescription', { email: submittedEmail })}
              </p>
            </div>
          </div>
          <Field>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isResending}
              onClick={() => {
                void handleResend()
              }}
            >
              {t('auth.forgotPassword.resend')}
            </Button>
            {resendMessage ? (
              <p className="text-secondary text-center text-sm">{resendMessage}</p>
            ) : null}
            {resendError ? <p className="text-danger text-center text-sm">{resendError}</p> : null}
          </Field>
          <p className="text-secondary text-center text-sm">
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => {
                setSubmittedEmail(null)
                setResendMessage(null)
                setResendError(null)
              }}
            >
              {t('auth.forgotPassword.useDifferentEmail')}
            </button>
          </p>
          <p className="text-secondary text-center text-sm">
            <Link to="/login" className="underline underline-offset-4">
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </p>
        </FieldGroup>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        void onSubmit(event)
      }}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-medium">{t('auth.forgotPassword.title')}</h1>
          <p className="text-secondary text-sm text-balance">
            {t('auth.forgotPassword.description')}
          </p>
        </div>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t('common.email')}</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('auth.forgotPassword.submit')}
          </Button>
        </Field>
        <p className="text-secondary text-center text-sm">
          <Link to="/login" className="underline underline-offset-4">
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
