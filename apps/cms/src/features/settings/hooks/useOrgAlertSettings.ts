import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useIsOrgAdmin } from '@/features/organizations/hooks/useIsOrgAdmin'
import { useActiveOrganization } from '@/features/organizations/store/organizationStore'
import { orgAlertSettingsApi } from '@/features/settings/api/orgAlertSettingsApi'
import type { UpdateOrgAlertSettingsRequest } from '@/features/settings/types/orgAlertSettings.types'

export const orgAlertSettingsQueryKey = (organizationId: string | null) =>
  ['org-alert-settings', organizationId] as const

/** Loads alert settings for the active org. Only fetches for org admins. */
export function useOrgAlertSettings() {
  const organizationId = useActiveOrganization()?.id ?? null
  const isAdmin = useIsOrgAdmin()

  return useQuery({
    queryKey: orgAlertSettingsQueryKey(organizationId),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('No active organization')
      }
      return orgAlertSettingsApi.get(organizationId)
    },
    enabled: Boolean(organizationId) && isAdmin,
  })
}

export function useUpdateOrgAlertSettings() {
  const queryClient = useQueryClient()
  const organizationId = useActiveOrganization()?.id ?? null

  return useMutation({
    mutationFn: (payload: UpdateOrgAlertSettingsRequest) => {
      if (!organizationId) {
        throw new Error('No active organization')
      }
      return orgAlertSettingsApi.update(organizationId, payload)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(orgAlertSettingsQueryKey(organizationId), data)
    },
  })
}
