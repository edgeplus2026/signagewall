import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { appsApi } from '@/features/apps/api/appsApi'
import { connectionsApi } from '@/features/apps/api/connectionsApi'
import {
  appInstanceDetailQueryKey,
  appsQueryKey,
} from '@/features/apps/lib/appsQueryKeys'
import type { ConnectionProvider } from '@/features/apps/types/connection.types'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

function useActiveOrganizationId() {
  return useOrganizationStore((state) => state.activeOrganizationId)
}

function connectionsQueryKey(organizationId: string | null | undefined) {
  return [...appsQueryKey(organizationId), 'connections'] as const
}

/**
 * Search a connection's resources for a `remote-select` field (by its
 * `remoteSource`, e.g. Canva designs or Google calendars). Keyed on the
 * (already debounced) query so each term is cached; `keepPreviousData` keeps the
 * last results on screen while the next search loads (no flicker). Disabled
 * until a connection is chosen.
 */
export function useRemoteOptions(
  connectionId: string | undefined,
  source: string,
  query: string,
) {
  const organizationId = useActiveOrganizationId()
  return useQuery({
    queryKey: [
      ...connectionsQueryKey(organizationId),
      'browse',
      source,
      connectionId ?? 'none',
      query,
    ],
    queryFn: () =>
      connectionsApi.browseRemoteOptions(connectionId ?? '', source, query),
    enabled: Boolean(organizationId) && Boolean(connectionId),
    placeholderData: keepPreviousData,
  })
}

/** Token-free summary of the instance's connected account ("Connected as X"). */
export function useConnection(connectionId: string | undefined) {
  const organizationId = useActiveOrganizationId()
  return useQuery({
    queryKey: [
      ...connectionsQueryKey(organizationId),
      'detail',
      connectionId ?? 'none',
    ],
    queryFn: () => connectionsApi.getOne(connectionId ?? ''),
    enabled: Boolean(organizationId) && Boolean(connectionId),
  })
}

/**
 * Start the OAuth flow for an instance: fetch the provider URL, then navigate
 * the browser. The backend binds the resulting connection to `instanceId` and
 * redirects back to the instance config page.
 */
export function useStartConnection() {
  return useMutation({
    mutationFn: ({
      provider,
      appSlug,
      instanceId,
    }: {
      provider: ConnectionProvider
      appSlug: string
      instanceId: string
    }) => connectionsApi.start(provider, appSlug, instanceId),
    onSuccess: (url) => {
      window.location.href = url
    },
  })
}

/** Disconnect an instance's account; refreshes the instance so the form resets. */
export function useDisconnectInstance() {
  const organizationId = useActiveOrganizationId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instanceId: string) => appsApi.disconnectInstance(instanceId),
    onSuccess: (_data, instanceId) => {
      void queryClient.invalidateQueries({
        queryKey: appInstanceDetailQueryKey(organizationId, instanceId),
      })
    },
  })
}
