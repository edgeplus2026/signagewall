import { organizationApi } from '@/features/organizations/api/organizationApi'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { queryClient } from '@/providers/QueryProvider'

export async function syncOrganizationsQuery(): Promise<void> {
  const organizations = await organizationApi.list()
  useOrganizationStore.getState().setOrganizations(organizations)
  queryClient.setQueryData(['organizations'], organizations)
}
