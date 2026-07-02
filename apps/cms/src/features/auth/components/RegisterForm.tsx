import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { PhoneInput } from '@/components/ui/phone-input'
import { authApi } from '@/features/auth/api/authApi'
import { invitationsApi } from '@/features/auth/api/invitationsApi'
import { GoogleLoginButton } from '@/features/auth/components/GoogleLoginButton'
import { resolveAuthFormError, resolveRegisterErrorField } from '@/features/auth/lib/authFormError'
import { createRegisterSchema, type RegisterSchema } from '@/features/auth/schemas/authSchemas'
import { useAuthStore } from '@/features/auth/store/authStore'
import { isPendingVerification } from '@/features/auth/types/auth.types'
import { organizationApi } from '@/features/organizations/api/organizationApi'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

export function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? undefined
  const setAuth = useAuthStore((state) => state.setAuth)
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations)
  const setActiveOrganization = useOrganizationStore((state) => state.setActiveOrganization)
  const registerSchema = useMemo(() => createRegisterSchema(t), [t])

  const {
    data: invitePreview,
    isLoading: isInviteLoading,
    isError: isInviteError,
  } = useQuery({
    queryKey: ['invitation', inviteToken],
    queryFn: () => {
      if (!inviteToken) return Promise.resolve(null)
      return invitationsApi.getPreview(inviteToken)
    },
    enabled: !!inviteToken,
    retry: false,
  })

  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      password: '',
      acceptedLegal: false,
    },
  })

  useEffect(() => {
    if (!invitePreview || !inviteToken) {
      return
    }

    if (invitePreview.accountExists) {
      void navigate(`/login?invite=${inviteToken}`, { replace: true })
      return
    }

    reset({
      name: '',
      email: invitePreview.email,
      phone: '',
      company: '',
      password: '',
      acceptedLegal: false,
    })
  }, [invitePreview, inviteToken, navigate, reset])

  const onSubmit = handleSubmit(async (data) => {
    clearErrors(['email', 'password'])

    try {
      const response = await authApi.register({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        acceptedLegal: data.acceptedLegal,
        ...(data.company ? { company: data.company } : {}),
        ...(inviteToken ? { inviteToken } : {}),
      })

      // Standard sign-ups must confirm their email before logging in; no
      // tokens are issued. Invited users are auto-verified and logged in.
      if (isPendingVerification(response)) {
        void navigate(`/check-email?email=${encodeURIComponent(response.email)}`)
        return
      }

      setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken)

      if (inviteToken) {
        const organizations = await organizationApi.list()
        setOrganizations(organizations)
        if (invitePreview?.organizationId) {
          setActiveOrganization(invitePreview.organizationId)
        }
      }

      toast.success(t('auth.register.success'))
      void navigate('/dashboard')
    } catch (error) {
      const field = resolveRegisterErrorField(error)
      setError(field, {
        message: resolveAuthFormError(error, 'auth.register.error', t),
      })
    }
  })

  if (inviteToken && isInviteLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="border-brand h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-secondary text-sm">{t('common.loading')}</p>
      </div>
    )
  }

  if (inviteToken && isInviteError) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-medium">{t('auth.register.inviteInvalidTitle')}</h1>
        <p className="text-secondary text-sm text-balance">
          {t('auth.register.inviteInvalidDescription')}
        </p>
        <Link to="/register" className="text-sm underline underline-offset-4">
          {t('auth.register.inviteInvalidAction')}
        </Link>
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
          <h1 className="text-2xl font-medium">{t('auth.register.title')}</h1>
          <p className="text-secondary text-sm text-balance">{t('auth.register.description')}</p>
        </div>

        {invitePreview ? (
          <div className="bg-success/10 text-success flex flex-col items-center gap-1 rounded-lg px-4 py-3 text-center text-sm">
            <span className="font-medium">{t('auth.register.inviteBadgeTitle')}</span>
            <span>
              {t('auth.register.inviteBadgeDescription', { name: invitePreview.organizationName })}
            </span>
          </div>
        ) : null}

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">{t('common.name')}</FieldLabel>
          <Input id="name" autoComplete="name" {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t('common.email')}</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            disabled={!!invitePreview}
            {...register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="phone">{t('common.phone')}</FieldLabel>
          <Controller
            name="phone"
            control={control}
            render={({ field: { onChange, value, onBlur, ref } }) => (
              <PhoneInput
                id="phone"
                value={value}
                onChange={(phone) => {
                  onChange(phone || '')
                }}
                onBlur={onBlur}
                ref={ref}
                placeholder={t('common.phonePlaceholder')}
              />
            )}
          />
          <FieldError errors={[errors.phone]} />
        </Field>
        <Field data-invalid={!!errors.company}>
          <FieldLabel htmlFor="company">
            {t('common.company')}{' '}
            <span className="text-secondary font-normal">({t('common.optional')})</span>
          </FieldLabel>
          <Input id="company" autoComplete="organization" {...register('company')} />
          <FieldError errors={[errors.company]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">{t('common.password')}</FieldLabel>
          <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.acceptedLegal}>
          <div className="flex items-start gap-2.5">
            <Controller
              name="acceptedLegal"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="acceptedLegal"
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true)
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />
            <FieldLabel htmlFor="acceptedLegal" className="text-sm leading-snug font-normal">
              <Trans
                i18nKey="auth.register.acceptLegal"
                components={{
                  terms: (
                    <Link
                      to="/legal/terms"
                      target="_blank"
                      className="text-primary underline underline-offset-4"
                    />
                  ),
                  privacy: (
                    <Link
                      to="/legal/privacy"
                      target="_blank"
                      className="text-primary underline underline-offset-4"
                    />
                  ),
                }}
              />
            </FieldLabel>
          </div>
          <FieldError errors={[errors.acceptedLegal]} />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('auth.register.submit')}
          </Button>
        </Field>
        <FieldSeparator>{t('common.orContinueWith')}</FieldSeparator>
        <Field>
          <GoogleLoginButton />
          <FieldDescription className="text-center">
            {t('auth.register.hasAccount')}{' '}
            <Link to="/login" className="underline underline-offset-4">
              {t('auth.register.signIn')}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
