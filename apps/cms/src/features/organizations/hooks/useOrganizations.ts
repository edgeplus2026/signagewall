import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { organizationApi } from '@/features/organizations/api/organizationApi'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { useAuthStore } from '@/features/auth/store/authStore'

export function useOrganizations() {
  const token = useAuthStore((state) => state.token)
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations)

  const query = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationApi.list,
    enabled: !!token,
    retry: false,
  })

  useEffect(() => {
    if (query.data) {
      setOrganizations(query.data)
    }
  }, [query.data, setOrganizations])

  return query
}
