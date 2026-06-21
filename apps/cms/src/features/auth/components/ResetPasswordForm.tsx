import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/features/auth/api/authApi'
import { resolveAuthFormError } from '@/features/auth/lib/authFormError'
import {
  createResetPasswordSchema,
  type ResetPasswordSchema,
} from '@/features/auth/schemas/authSchemas'

export function ResetPasswordForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const resetPasswordSchema = useMemo(() => createResetPasswordSchema(t), [t])

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!token) {
      setError('password', { message: t('auth.resetPassword.missingToken') })
    }
  }, [setError, t, token])

  const onSubmit = handleSubmit(async (data) => {
    if (!token) {
      return
    }

    clearErrors('password')

    try {
      await authApi.resetPassword({ ...data, token })
      toast.success(t('auth.resetPassword.success'))
      void navigate('/login')
    } catch (error) {
      setError('password', {
        message: resolveAuthFormError(error, 'auth.resetPassword.error', t),
      })
    }
  })

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        void onSubmit(event)
      }}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-medium">{t('auth.resetPassword.title')}</h1>
          <p className="text-secondary text-sm text-balance">
            {t('auth.resetPassword.description')}
          </p>
        </div>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">{t('common.newPassword')}</FieldLabel>
          <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">{t('common.confirmPassword')}</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
            {t('auth.resetPassword.submit')}
          </Button>
        </Field>
        <p className="text-secondary text-center text-sm">
          <Link to="/login" className="underline underline-offset-4">
            {t('auth.resetPassword.backToLogin')}
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
