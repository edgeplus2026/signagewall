import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/features/auth/api/authApi'
import { invitationsApi } from '@/features/auth/api/invitationsApi'
import { GoogleLoginButton } from '@/features/auth/components/GoogleLoginButton'
import { resolveAuthFormError } from '@/features/auth/lib/authFormError'
import { createLoginSchema, type LoginSchema } from '@/features/auth/schemas/authSchemas'
import { useAuthStore } from '@/features/auth/store/authStore'
import { toApiError } from '@/lib/api-error'

type LoginFormValues = LoginSchema & {
  google?: string
}

interface LoginLocationState {
  formError?: string
}

export function LoginForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? undefined
  const setAuth = useAuthStore((state) => state.setAuth)
  const { data: invitePreview } = useQuery({
    queryKey: ['invitation', inviteToken],
    queryFn: () => {
      if (!inviteToken) return Promise.resolve(null)

      return invitationsApi.getPreview(inviteToken)
    },
    enabled: !!inviteToken,
    retry: false,
  })
  const loginSchema = useMemo(() => createLoginSchema(t), [t])

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    const formError = (location.state as LoginLocationState | null)?.formError
    if (!formError) {
      return
    }

    setError('google', { message: formError })
    void navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate, setError])

  const onSubmit = handleSubmit(async (data) => {
    clearErrors('password')

    try {
      const response = await authApi.login(data)
      setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken)
      toast.success(t('auth.login.success'))
      void navigate(inviteToken ? `/accept-invite?invite=${inviteToken}` : '/dashboard')
    } catch (error) {
      // A 403 on login means valid credentials but an unverified email.
      // Route the user to the resend flow instead of showing a field error.
      if (toApiError(error).code === 'FORBIDDEN') {
        void navigate(`/check-email?email=${encodeURIComponent(data.email)}`)
        return
      }

      setError('password', {
        message: resolveAuthFormError(error, 'auth.login.error', t),
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
          <h1 className="text-2xl font-medium">{t('auth.login.title')}</h1>
          <p className="text-secondary text-sm text-balance">
            {invitePreview
              ? t('auth.login.inviteDescription', {
                  name: invitePreview.organizationName,
                })
              : t('auth.login.description')}
          </p>
        </div>
        {invitePreview ? (
          <div className="bg-success/10 text-success flex flex-col items-center gap-1 rounded-lg px-4 py-3 text-center text-sm">
            <span className="font-medium">{t('auth.login.inviteBadgeTitle')}</span>
            <span>
              {t('auth.login.inviteBadgeDescription', {
                name: invitePreview.organizationName,
              })}
            </span>
          </div>
        ) : null}
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t('common.email')}</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">{t('common.password')}</FieldLabel>
          <PasswordInput id="password" autoComplete="current-password" {...register('password')} />
          <FieldError errors={[errors.password]} />
        </Field>
        <Link
          to="/forgot-password"
          className="ml-auto w-fit text-sm underline-offset-4 hover:underline"
        >
          {t('auth.login.forgotPassword')}
        </Link>
        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('auth.login.submit')}
          </Button>
        </Field>
        <FieldSeparator>{t('common.orContinueWith')}</FieldSeparator>
        <Field data-invalid={!!errors.google}>
          <GoogleLoginButton />
          <FieldError errors={[errors.google]} />
          <FieldDescription className="text-center">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="underline underline-offset-4">
              {t('auth.login.signUp')}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
