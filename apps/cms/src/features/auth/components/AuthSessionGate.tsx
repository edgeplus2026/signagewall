import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { FullPageLoader } from '@/components/common/FullPageLoader'
import { useAuthHydrated } from '@/features/auth/hooks/useAuthHydrated'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useOrganizationHydrated } from '@/features/organizations/hooks/useOrganizationHydrated'
import { useOrganizations } from '@/features/organizations/hooks/useOrganizations'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

export function AuthSessionGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const authHydrated = useAuthHydrated()
  const orgHydrated = useOrganizationHydrated()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const cachedOrganizationCount = useOrganizationStore(
    (state) => state.organizations.length,
  )
  const { isLoading: isUserLoading } = useCurrentUser()
  const { isLoading: isOrganizationsLoading } = useOrganizations()

  const isCreateOrganizationRoute = location.pathname === '/create-organization'
  const needsOrganizationBootstrap =
    orgHydrated &&
    !isCreateOrganizationRoute &&
    cachedOrganizationCount === 0

  if (authHydrated && orgHydrated && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const showBootstrapLoader =
    !authHydrated ||
    !orgHydrated ||
    isUserLoading ||
    (needsOrganizationBootstrap && isOrganizationsLoading)

  if (showBootstrapLoader) {
    return <FullPageLoader />
  }

  return children
}
