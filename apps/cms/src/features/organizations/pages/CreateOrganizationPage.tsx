import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { organizationApi } from '@/features/organizations/api/organizationApi'
import { useOrganizations } from '@/features/organizations/hooks/useOrganizations'
import { syncOrganizationsQuery } from '@/features/organizations/lib/syncOrganizationsQuery'
import {
  createOrganizationSchema,
  type OrganizationSchema,
} from '@/features/organizations/schemas/organizationSchemas'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { getApiErrorMessage } from '@/lib/api-error'

export default function CreateOrganizationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: organizations, isLoading } = useOrganizations()
  const setActiveOrganization = useOrganizationStore((state) => state.setActiveOrganization)
  const organizationSchema = useMemo(() => createOrganizationSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationSchema>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: '' },
  })

  if (!isLoading && organizations && organizations.length > 0) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      const organization = await organizationApi.create({ name: data.name.trim() })
      setActiveOrganization(organization.id)
      await syncOrganizationsQuery()
      toast.success(t('organizations.create.success'))
      void navigate('/dashboard', { replace: true })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('organizations.create.error')))
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-medium">{t('organizations.onboarding.title')}</h1>
          <p className="text-secondary text-sm text-balance">
            {t('organizations.onboarding.description')}
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="onboarding-organization-name">
                {t('organizations.name')}
              </FieldLabel>
              <Input
                id="onboarding-organization-name"
                autoComplete="organization"
                {...register('name')}
              />
              <FieldError errors={[errors.name]} />
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('organizations.onboarding.submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
