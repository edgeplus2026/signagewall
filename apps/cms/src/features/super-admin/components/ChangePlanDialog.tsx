import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createUpdateUserPlanSchema,
  type UpdateUserPlanSchema,
} from '@/features/plans/schemas/planSchemas'
import { useUpdateUserPlan } from '@/features/super-admin/hooks/useAdminUsers'
import type { AdminUserListItem } from '@/features/super-admin/types/admin.types'
import { getApiErrorMessage } from '@/lib/api-error'

const FORM_ID = 'change-plan-form'

interface ChangePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUserListItem | null
}

/**
 * Sets a customer's tier and licence count. This *is* the billing system: an
 * invoice is settled out of band, and this reflects it.
 *
 * Enterprise clears the trial clock. Free restarts a full 21 days rather than
 * expiring the account immediately — a mis-click here must never be one sweep
 * away from erasing a customer.
 */
export function ChangePlanDialog({ open, onOpenChange, user }: ChangePlanDialogProps) {
  const { t } = useTranslation()
  const updatePlan = useUpdateUserPlan()
  const schema = useMemo(() => createUpdateUserPlanSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserPlanSchema>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'free', screenLimit: 1 },
  })

  useEffect(() => {
    if (!open || !user) return
    reset({ plan: user.plan, screenLimit: user.screenLimit })
  }, [open, user, reset])

  // `useWatch` rather than `watch()` — the latter returns a fresh function each
  // render, which the React Compiler cannot memoize.
  const selectedPlan = useWatch({ control, name: 'plan' })

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return

    try {
      await updatePlan.mutateAsync({
        userId: user.id,
        payload: { plan: data.plan, screenLimit: data.screenLimit },
      })
      toast.success(t('superAdmin.plan.success', { name: user.name }))
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.plan.error')))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('superAdmin.plan.title')}</DialogTitle>
          <DialogDescription>
            {t('superAdmin.plan.description', {
              name: user?.name,
              email: user?.email,
            })}
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
            <Field>
              <FieldLabel htmlFor="plan-tier">{t('superAdmin.plan.tier')}</FieldLabel>
              <Controller
                control={control}
                name="plan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="plan-tier" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">
                        {t('superAdmin.plan.tiers.free')}
                      </SelectItem>
                      <SelectItem value="enterprise">
                        {t('superAdmin.plan.tiers.enterprise')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field data-invalid={!!errors.screenLimit}>
              <FieldLabel htmlFor="plan-screen-limit">
                {t('superAdmin.plan.screenLimit')}
              </FieldLabel>
              <Input
                id="plan-screen-limit"
                type="number"
                min={0}
                inputMode="numeric"
                {...register('screenLimit', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.screenLimit]} />
              <p className="text-secondary text-xs">
                {selectedPlan === 'free'
                  ? t('superAdmin.plan.hintFree')
                  : t('superAdmin.plan.hintEnterprise')}
              </p>
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting || updatePlan.isPending}
          >
            {t('superAdmin.plan.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
