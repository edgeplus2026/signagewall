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
import { useAuthStore } from '@/features/auth/store/authStore'
import { settingsApi } from '@/features/settings/api/settingsApi'
import {
  createSetPasswordSchema,
  type SetPasswordSchema,
} from '@/features/settings/schemas/settingsSchemas'
import { getApiErrorMessage } from '@/lib/api-error'

const FORM_ID = 'set-password-form'

interface SetPasswordSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SetPasswordSheet({ open, onOpenChange }: SetPasswordSheetProps) {
  const { t } = useTranslation()
  const updateUser = useAuthStore((state) => state.updateUser)
  const setPasswordSchema = useMemo(() => createSetPasswordSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordSchema>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
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
      await settingsApi.setPassword(data)
      updateUser({ hasPassword: true })
      toast.success(t('settings.security.setPasswordSuccess'))
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.security.setPasswordError')))
    }
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t('settings.security.setPasswordDialogTitle')}</SheetTitle>
          <SheetDescription>{t('settings.security.setPasswordDialogDescription')}</SheetDescription>
        </SheetHeader>
        <form
          id={FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="set-new-password">{t('common.newPassword')}</FieldLabel>
              <PasswordInput
                id="set-new-password"
                autoComplete="new-password"
                {...register('password')}
              />
              <FieldError errors={[errors.password]} />
            </Field>
            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="set-confirm-password">{t('common.confirmPassword')}</FieldLabel>
              <PasswordInput
                id="set-confirm-password"
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
            {t('settings.security.setPasswordSubmit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
