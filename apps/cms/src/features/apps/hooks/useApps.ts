import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { appsApi } from '@/features/apps/api/appsApi'
import {
  appCatalogQueryKey,
  appDetailQueryKey,
  appInstanceDetailQueryKey,
  appInstancesQueryKey,
  appInstancesRootQueryKey,
  appsQueryKey,
} from '@/features/apps/lib/appsQueryKeys'
import type { AppInstanceConfig } from '@/features/apps/types/app.types'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

function useActiveOrganizationId() {
  return useOrganizationStore((state) => state.activeOrganizationId)
}

// ----- Catalog -----

export function useApps() {
  const organizationId = useActiveOrganizationId()
  return useQuery({
    queryKey: appCatalogQueryKey(organizationId),
    queryFn: appsApi.listCatalog,
    enabled: Boolean(organizationId),
  })
}

/**
 * Resolve a single app by id. Fetched directly (not from the catalog list) so an
 * installed app stays resolvable even if it's later made non-public.
 */
export function useApp(appId: string | undefined) {
  const organizationId = useActiveOrganizationId()
  return useQuery({
    queryKey: appDetailQueryKey(organizationId, appId ?? ''),
    queryFn: () => appsApi.getApp(appId ?? ''),
    enabled: Boolean(organizationId) && Boolean(appId),
  })
}

export function useInstallApp() {
  const organizationId = useActiveOrganizationId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appId: string) => appsApi.install(appId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appsQueryKey(organizationId) })
    },
  })
}

export function useUninstallApp() {
  const organizationId = useActiveOrganizationId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appId: string) => appsApi.uninstall(appId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appsQueryKey(organizationId) })
    },
  })
}

// ----- Instances -----

export function useAppInstances(appId: string | undefined) {
  const organizationId = useActiveOrganizationId()
  return useQuery({
    queryKey: appInstancesQueryKey(organizationId, appId),
    queryFn: () => appsApi.listInstances(appId),
    enabled: Boolean(organizationId) && Boolean(appId),
  })
}

/** Every app instance in the org, regardless of app — used by content editors. */
export function useAllAppInstances() {
  const organizationId = useActiveOrganizationId()
  return useQuery({
    queryKey: appInstancesQueryKey(organizationId),
    queryFn: () => appsApi.listInstances(),
    enabled: Boolean(organizationId),
  })
}

export function useAppInstance(instanceId: string | undefined) {
  const organizationId = useActiveOrganizationId()
  return useQuery({
    queryKey: appInstanceDetailQueryKey(organizationId, instanceId ?? ''),
    queryFn: () => appsApi.getInstance(instanceId ?? ''),
    enabled: Boolean(organizationId) && Boolean(instanceId),
  })
}

function useInstanceInvalidation() {
  const organizationId = useActiveOrganizationId()
  const queryClient = useQueryClient()
  return (instanceId?: string) => {
    // Prefix-invalidate so both the per-app list (keyed on appId) and the
    // org-wide "all" list refresh — they diverge on their last key segment.
    void queryClient.invalidateQueries({
      queryKey: appInstancesRootQueryKey(organizationId),
    })
    if (instanceId) {
      void queryClient.invalidateQueries({
        queryKey: appInstanceDetailQueryKey(organizationId, instanceId),
      })
    }
  }
}

export function useCreateInstance() {
  const invalidate = useInstanceInvalidation()
  return useMutation({
    mutationFn: ({ appId, name }: { appId: string; name?: string }) =>
      appsApi.createInstance(appId, name),
    onSuccess: (instance) => {
      invalidate(instance.id)
    },
  })
}

export function useRenameInstance() {
  const invalidate = useInstanceInvalidation()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      appsApi.renameInstance(id, name),
    onSuccess: (instance) => {
      invalidate(instance.id)
    },
  })
}

export function useUpdateInstanceConfig() {
  const invalidate = useInstanceInvalidation()
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: AppInstanceConfig }) =>
      appsApi.updateInstanceConfig(id, config),
    onSuccess: (instance) => {
      invalidate(instance.id)
    },
  })
}

export function useDuplicateInstance() {
  const invalidate = useInstanceInvalidation()
  return useMutation({
    mutationFn: (id: string) => appsApi.duplicateInstance(id),
    onSuccess: (instance) => {
      invalidate(instance.id)
    },
  })
}

export function useDeleteInstance() {
  const invalidate = useInstanceInvalidation()
  return useMutation({
    mutationFn: (id: string) => appsApi.deleteInstance(id),
    onSuccess: () => {
      invalidate()
    },
  })
}
