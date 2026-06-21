import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { settingsApi } from '@/features/settings/api/settingsApi'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  createChangePasswordSchema,
  type ChangePasswordSchema,
} from '@/features/settings/schemas/settingsSchemas'

const FORM_ID = 'change-password-form'

interface ChangePasswordSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordSheet({ open, onOpenChange }: ChangePasswordSheetProps) {
  const { t } = useTranslation()
  const changePasswordSchema = useMemo(() => createChangePasswordSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await settingsApi.changePassword(data)
      toast.success(t('settings.security.passwordSuccess'))
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.security.passwordError')))
    }
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t('settings.security.dialogTitle')}</SheetTitle>
          <SheetDescription>{t('settings.security.dialogDescription')}</SheetDescription>
        </SheetHeader>
        <form
          id={FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.currentPassword}>
              <FieldLabel htmlFor="current-password">
                {t('settings.security.currentPassword')}
              </FieldLabel>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                {...register('currentPassword')}
              />
              <FieldError errors={[errors.currentPassword]} />
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="new-password">{t('common.newPassword')}</FieldLabel>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                {...register('password')}
              />
              <FieldError errors={[errors.password]} />
            </Field>
            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirm-password">{t('common.confirmPassword')}</FieldLabel>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              <FieldError errors={[errors.confirmPassword]} />
            </Field>
          </FieldGroup>
        </form>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleOpenChange(false)
            }}
          >
            {t('settings.security.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {t('settings.security.submit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
