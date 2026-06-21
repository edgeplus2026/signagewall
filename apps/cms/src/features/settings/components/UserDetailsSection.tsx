import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/features/auth/store/authStore'
import { settingsApi } from '@/features/settings/api/settingsApi'
import { OrganizationSelect } from '@/features/settings/components/OrganizationSelect'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'
import {
  createUpdateProfileSchema,
  type UpdateProfileSchema,
} from '@/features/settings/schemas/settingsSchemas'
import { getApiErrorMessage } from '@/lib/api-error'

export function UserDetailsSection() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const updateProfileSchema = useMemo(() => createUpdateProfileSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileSchema>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      company: user?.company ?? '',
    },
  })

  useEffect(() => {
    reset({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      company: user?.company ?? '',
    })
  }, [user, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      const updatedUser = await settingsApi.updateProfile({
        name: data.name.trim(),
        phone: data.phone,
        ...(data.company ? { company: data.company } : {}),
      })
      updateUser(updatedUser)
      toast.success(t('settings.profile.success'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.profile.error')))
    }
  })

  return (
    <SettingsSection title={t('settings.sections.profile')}>
      <form
        className="contents"
        onSubmit={(event) => {
          void onSubmit(event)
        }}
      >
        <SettingsRow
          label={t('settings.profile.email')}
          {...(user?.provider === 'google'
            ? { description: t('settings.profile.googleSignup') }
            : {})}
        >
          <span className="text-secondary text-sm">{user?.email ?? t('layout.guestEmail')}</span>
        </SettingsRow>

        <Separator />

        <SettingsRow label={t('common.name')} field error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
        </SettingsRow>

        <Separator />

        <SettingsRow label={t('settings.profile.phone')} field error={errors.phone?.message}>
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
                aria-invalid={!!errors.phone}
              />
            )}
          />
        </SettingsRow>

        <Separator />

        <SettingsRow label={t('settings.profile.company')} field error={errors.company?.message}>
          <Input
            id="company"
            autoComplete="organization"
            aria-invalid={!!errors.company}
            {...register('company')}
          />
        </SettingsRow>

        <Separator />

        <SettingsRow label={t('settings.profile.organization')}>
          <OrganizationSelect />
        </SettingsRow>

        <div className="flex justify-end px-4 py-3">
          <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
            {t('settings.profile.save')}
          </Button>
        </div>
      </form>
    </SettingsSection>
  )
}
