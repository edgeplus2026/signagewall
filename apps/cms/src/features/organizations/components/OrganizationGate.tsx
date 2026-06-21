import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { useOrganizations } from '@/features/organizations/hooks/useOrganizations'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

export function OrganizationGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { data, isError } = useOrganizations()
  const storeOrganizationCount = useOrganizationStore(
    (state) => state.organizations.length,
  )

  if (isError && storeOrganizationCount === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-secondary text-center text-sm">{t('organizations.loadError')}</p>
      </div>
    )
  }

  const organizationCount = Math.max(data?.length ?? 0, storeOrganizationCount)

  if (organizationCount === 0 && location.pathname !== '/create-organization') {
    return <Navigate to="/create-organization" replace />
  }

  return children
}
