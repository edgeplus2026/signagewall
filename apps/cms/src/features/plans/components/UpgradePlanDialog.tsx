import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { usePlan, useRequestUpgrade } from '@/features/plans/hooks/usePlan'
import {
  createUpgradeRequestSchema,
  type UpgradeRequestSchema,
} from '@/features/plans/schemas/planSchemas'
import { usePlanDialogStore } from '@/features/plans/store/planDialogStore'
import { getApiErrorMessage } from '@/lib/api-error'

const FORM_ID = 'upgrade-plan-form'

/**
 * The "how many screens do you need" form — the same ask as the marketing
 * site's quote form, minus the identity fields, which come from the session.
 *
 * There is no payment step by design: this books a lead, we invoice, and a
 * super-admin raises the plan. The copy therefore promises a reply, not access.
 */
export function UpgradePlanDialog() {
  const { t } = useTranslation()
  const open = usePlanDialogStore((state) => state.open)
  const trigger = usePlanDialogStore((state) => state.trigger)
  const close = usePlanDialogStore((state) => state.close)

  const { data: plan } = usePlan()
  const { data: user } = useCurrentUser()
  const requestUpgrade = useRequestUpgrade()
  const schema = useMemo(() => createUpgradeRequestSchema(t), [t])

  const isFree = plan?.plan === 'free'
  const currentLimit = plan?.screenLimit ?? 0

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpgradeRequestSchema>({
    resolver: zodResolver(schema),
    defaultValues: { requestedScreens: 1, phone: '', company: '', message: '' },
  })

  useEffect(() => {
    if (!open) return
    // Prefilled with one more than they hold: the ask is almost always "the
    // screen I was just blocked from creating", and enterprise limits are
    // arbitrary numbers nobody remembers.
    reset({
      requestedScreens: Math.max(1, currentLimit + 1),
      phone: user?.phone ?? '',
      company: user?.company ?? '',
      message: '',
    })
  }, [open, currentLimit, user?.phone, user?.company, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      await requestUpgrade.mutateAsync({
        requestedScreens: data.requestedScreens,
        ...(data.phone.trim() ? { phone: data.phone.trim() } : {}),
        ...(data.company.trim() ? { company: data.company.trim() } : {}),
        ...(data.message.trim() ? { message: data.message.trim() } : {}),
      })
      toast.success(t('plans.upgrade.success'))
      close()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('plans.upgrade.error')))
    }
  })

  const descriptionKey =
    trigger === 'screens'
      ? 'plans.upgrade.descriptionScreenLimit'
      : trigger === 'organizations'
        ? 'plans.upgrade.descriptionOrganizationLimit'
        : isFree
          ? 'plans.upgrade.descriptionTrial'
          : 'plans.upgrade.descriptionLicences'

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isFree ? t('plans.upgrade.title') : t('plans.licences.title')}
          </DialogTitle>
          <DialogDescription>
            {t(descriptionKey, { limit: currentLimit })}
          </DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          className="px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.requestedScreens}>
              <FieldLabel htmlFor="upgrade-screens">
                {t('plans.upgrade.screens')}
              </FieldLabel>
              <Input
                id="upgrade-screens"
                type="number"
                min={1}
                inputMode="numeric"
                {...register('requestedScreens', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.requestedScreens]} />
            </Field>

            <Field data-invalid={!!errors.company}>
              <FieldLabel htmlFor="upgrade-company">
                {t('plans.upgrade.company')}
              </FieldLabel>
              <Input
                id="upgrade-company"
                autoComplete="organization"
                placeholder={t('plans.upgrade.companyPlaceholder')}
                {...register('company')}
              />
              <FieldError errors={[errors.company]} />
            </Field>

            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="upgrade-phone">
                {t('plans.upgrade.phone')}
              </FieldLabel>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <PhoneInput
                    id="upgrade-phone"
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

            <Field data-invalid={!!errors.message}>
              <FieldLabel htmlFor="upgrade-message">
                {t('plans.upgrade.message')}
              </FieldLabel>
              <Textarea
                id="upgrade-message"
                rows={3}
                placeholder={t('plans.upgrade.messagePlaceholder')}
                {...register('message')}
              />
              <FieldError errors={[errors.message]} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting || requestUpgrade.isPending}
          >
            {t('plans.upgrade.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
