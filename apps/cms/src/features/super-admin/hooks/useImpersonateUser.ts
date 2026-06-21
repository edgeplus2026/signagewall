import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { saveImpersonationBackup } from '@/features/auth/lib/impersonation'
import { useAuthStore } from '@/features/auth/store/authStore'
import { adminApi } from '@/features/super-admin/api/adminApi'
import { syncOrganizationsQuery } from '@/features/organizations/lib/syncOrganizationsQuery'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { getApiErrorMessage } from '@/lib/api-error'
import { resetAuthRefreshState } from '@/lib/axios'
import { useTranslation } from 'react-i18next'

export function useImpersonateUser() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const setImpersonationActive = useAuthStore((state) => state.setImpersonationActive)

  const impersonate = async (userId: string) => {
    const authState = useAuthStore.getState()
    const orgState = useOrganizationStore.getState()

    if (!authState.user || !authState.token || !authState.refreshToken) {
      return
    }

    try {
      resetAuthRefreshState()
      saveImpersonationBackup({
        user: authState.user,
        token: authState.token,
        refreshToken: authState.refreshToken,
        organizations: orgState.organizations,
        activeOrganizationId: orgState.activeOrganizationId,
      })

      const response = await adminApi.impersonate(userId)
      setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken)
      setImpersonationActive(true)
      useOrganizationStore.getState().reset()
      await syncOrganizationsQuery()
      toast.success(t('superAdmin.impersonation.startSuccess', { name: response.user.name }))
      void navigate('/dashboard')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.impersonation.startError')))
    }
  }

  return { impersonate }
}
