import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { appsApi } from '@/features/apps/api/appsApi'
import {
  appCatalogQueryKey,
  appInstanceDetailQueryKey,
  appInstancesQueryKey,
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

/** Resolve a single app from the cached catalog list (no extra request). */
export function useApp(appId: string | undefined) {
  const { data: apps, ...rest } = useApps()
  const app = useMemo(
    () => apps?.find((entry) => entry.id === appId),
    [apps, appId],
  )
  return { ...rest, data: app }
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
    void queryClient.invalidateQueries({
      queryKey: appInstancesQueryKey(organizationId),
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
    onSuccess: () => {
      invalidate()
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
