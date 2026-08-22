import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { appsApi } from '@/features/apps/api/appsApi'
import { ADMIN_APPS_QUERY_KEY, APPS_QUERY_ROOT } from '@/features/apps/lib/appsQueryKeys'

export function useAdminApps() {
  return useQuery({
    queryKey: ADMIN_APPS_QUERY_KEY,
    queryFn: appsApi.listAll,
  })
}

export function useSetAppVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      appsApi.setVisibility(id, isPublic),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_APPS_QUERY_KEY })
      // The org-facing catalog lives under a different key root, so publishing
      // or unpublishing an app in super-admin must refresh those caches too.
      void queryClient.invalidateQueries({ queryKey: [APPS_QUERY_ROOT] })
    },
  })
}
