import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  appsApi,
  type CreateAppPayload,
  type UpdateAppPayload,
} from '@/features/apps/api/appsApi'
import {
  ADMIN_APPS_QUERY_KEY,
  APPS_QUERY_ROOT,
} from '@/features/apps/lib/appsQueryKeys'

export function useAdminApps() {
  return useQuery({
    queryKey: ADMIN_APPS_QUERY_KEY,
    queryFn: appsApi.listAll,
  })
}

/** Code apps available to add to the catalog. */
export function useAvailableManifests() {
  return useQuery({
    queryKey: [...ADMIN_APPS_QUERY_KEY, 'manifests'],
    queryFn: appsApi.listManifests,
  })
}

function useAdminAppsInvalidation() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_APPS_QUERY_KEY })
    // Org-facing catalog lives under a different key root, so adding/editing
    // an app in super-admin must refresh those caches too.
    void queryClient.invalidateQueries({ queryKey: [APPS_QUERY_ROOT] })
  }
}

export function useCreateApp() {
  const invalidate = useAdminAppsInvalidation()
  return useMutation({
    mutationFn: (payload: CreateAppPayload) => appsApi.createApp(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateApp() {
  const invalidate = useAdminAppsInvalidation()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppPayload }) =>
      appsApi.updateApp(id, payload),
    onSuccess: invalidate,
  })
}

export function useSetAppVisibility() {
  const invalidate = useAdminAppsInvalidation()
  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      appsApi.setVisibility(id, isPublic),
    onSuccess: invalidate,
  })
}

export function useDeleteApp() {
  const invalidate = useAdminAppsInvalidation()
  return useMutation({
    mutationFn: (id: string) => appsApi.deleteApp(id),
    onSuccess: invalidate,
  })
}
