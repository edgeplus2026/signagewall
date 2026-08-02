import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { organizationApi } from '@/features/organizations/api/organizationApi'
import { syncOrganizationsQuery } from '@/features/organizations/lib/syncOrganizationsQuery'
import {
  createOrganizationSchema,
  type OrganizationSchema,
} from '@/features/organizations/schemas/organizationSchemas'
import {
  useOrganizationStore,
} from '@/features/organizations/store/organizationStore'
import type { Organization } from '@/features/organizations/types/organization.types'
import { getPlanLimitDetails } from '@/features/plans/lib/planLimit'
import { usePlanDialogStore } from '@/features/plans/store/planDialogStore'
import { getApiErrorMessage } from '@/lib/api-error'

const CREATE_FORM_ID = 'create-organization-form'
const UPDATE_FORM_ID = 'update-organization-form'

type OrganizationFormMode = 'create' | 'edit'

interface OrganizationFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: OrganizationFormMode
  organization?: Organization | null
}

export function OrganizationFormSheet({
  open,
  onOpenChange,
  mode,
  organization,
}: OrganizationFormSheetProps) {
  const { t } = useTranslation()
  const upsertOrganization = useOrganizationStore((state) => state.upsertOrganization)
  const setActiveOrganization = useOrganizationStore((state) => state.setActiveOrganization)
  const openPlanDialog = usePlanDialogStore((state) => state.openDialog)
  const organizationSchema = useMemo(() => createOrganizationSchema(t), [t])

  const formId = mode === 'create' ? CREATE_FORM_ID : UPDATE_FORM_ID

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationSchema>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (open && mode === 'edit' && organization) {
      reset({ name: organization.name })
    }
    if (!open) reset({ name: '' })
  }, [open, mode, organization, reset])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset({ name: '' })
    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (mode === 'create') {
        const created = await organizationApi.create({ name: data.name.trim() })
        setActiveOrganization(created.id)
        await syncOrganizationsQuery()
        toast.success(t('organizations.create.success'))
      } else if (organization) {
        const updated = await organizationApi.update(organization.id, {
          name: data.name.trim(),
        })
        upsertOrganization(updated)
        await syncOrganizationsQuery()
        toast.success(t('organizations.update.success'))
      }

      reset({ name: '' })
      onOpenChange(false)
    } catch (error) {
      // A free account is capped at one organization — otherwise the one-screen
      // limit is bypassed by making a second workspace. Send them to the
      // upgrade dialog rather than a toast they cannot act on.
      if (getPlanLimitDetails(error)) {
        handleOpenChange(false)
        openPlanDialog('organizations')
        return
      }
      const fallback =
        mode === 'create'
          ? t('organizations.create.error')
          : t('organizations.update.error')
      toast.error(getApiErrorMessage(error, fallback))
    }
  })

  const isCreate = mode === 'create'

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>
            {isCreate ? t('organizations.create.title') : t('organizations.update.title')}
          </SheetTitle>
          <SheetDescription>
            {isCreate
              ? t('organizations.create.description')
              : t('organizations.update.description')}
          </SheetDescription>
        </SheetHeader>
        <form
          id={formId}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor={`${mode}-organization-name`}>
                {t('organizations.name')}
              </FieldLabel>
              <Input
                id={`${mode}-organization-name`}
                autoComplete="organization"
                {...register('name')}
              />
              <FieldError errors={[errors.name]} />
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
            {t('organizations.form.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isCreate ? t('organizations.create.submit') : t('organizations.update.submit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
