import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { connectionsApi } from '@/features/apps/api/connectionsApi'
import { appsQueryKey } from '@/features/apps/lib/appsQueryKeys'
import type { ConnectionProvider } from '@/features/apps/types/connection.types'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

function useActiveOrganizationId() {
  return useOrganizationStore((state) => state.activeOrganizationId)
}

function connectionsQueryKey(organizationId: string | null | undefined) {
  return [...appsQueryKey(organizationId), 'connections'] as const
}

export function useConnections() {
  const organizationId = useActiveOrganizationId()
  return useQuery({
    queryKey: connectionsQueryKey(organizationId),
    queryFn: connectionsApi.list,
    enabled: Boolean(organizationId),
  })
}

export function useDeleteConnection() {
  const organizationId = useActiveOrganizationId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => connectionsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(organizationId),
      })
    },
  })
}

/** Start the OAuth flow: fetch the provider URL, then navigate the browser. */
export function useStartConnection() {
  return useMutation({
    mutationFn: ({
      provider,
      appSlug,
    }: {
      provider: ConnectionProvider
      appSlug: string
    }) => connectionsApi.start(provider, appSlug),
    onSuccess: (url) => {
      window.location.href = url
    },
  })
}
