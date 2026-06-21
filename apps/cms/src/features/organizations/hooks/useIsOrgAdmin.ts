import { useActiveOrganization } from '@/features/organizations/store/organizationStore'

export function useIsOrgAdmin(): boolean {
  const activeOrganization = useActiveOrganization()
  return activeOrganization?.role === 'admin'
}
