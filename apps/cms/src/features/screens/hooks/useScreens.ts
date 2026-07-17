import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { screensApi } from '@/features/screens/api/screensApi'
import {
  screenAvailabilityQueryKey,
  screenDetailQueryKey,
  screenDeviceQueryKey,
  screensQueryKey,
  screenStatusQueryKey,
} from '@/features/screens/lib/screenQueryKeys'
import {
  DEFAULT_DEVICE_SETTINGS,
  type AddAppsToScreensRequest,
  type AddMediaToScreensRequest,
  type AddPlaylistsToScreensRequest,
  type CreateScreenRequest,
  type ReplaceScreenItemsRequest,
  type Screen,
  type ScreenAvailability,
  type ScreenAvailabilityStatus,
  type ScreenDevice,
  type ScreenDeviceOrientation,
  type ScreenDeviceScale,
  type ScreenDeviceSettings,
  type ScreenLayout,
  type SetDeviceDailyReloadRequest,
  type UpdateScreenAvailabilityRequest,
  type UpdateScreenRequest,
} from '@/features/screens/types/screen.types'
import { ApiError } from '@/lib/api-error'

function useActiveOrganizationId() {
  return useOrganizationStore((state) => state.activeOrganizationId)
}

export function useScreens() {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: screensQueryKey(organizationId),
    queryFn: screensApi.list,
    enabled: Boolean(organizationId),
  })
}

export function useScreen(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: screenDetailQueryKey(organizationId, id ?? ''),
    queryFn: async (): Promise<Screen | null> => {
      if (!id) return null

      const [detail, items] = await Promise.all([
        screensApi.get(id),
        // Tolerate a missing screen here; `detail` being null is the canonical
        // "not found" signal and short-circuits below.
        screensApi.getItems(id).catch((error: unknown) => {
          if (error instanceof ApiError && error.code === 'NOT_FOUND') {
            return []
          }
          throw error
        }),
      ])
      if (!detail) return null

      return { ...detail, items }
    },
    enabled: Boolean(organizationId && id),
  })
}

export function useScreenAvailability(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: screenAvailabilityQueryKey(organizationId, id ?? ''),
    queryFn: (): Promise<ScreenAvailability | null> =>
      id ? screensApi.getAvailability(id) : Promise.resolve(null),
    enabled: Boolean(organizationId && id),
  })
}

export function useScreenStatus(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: screenStatusQueryKey(organizationId, id ?? ''),
    queryFn: (): Promise<ScreenAvailabilityStatus | null> =>
      id ? screensApi.getStatus(id) : Promise.resolve(null),
    enabled: Boolean(organizationId && id),
    // `isOn` flips at working-hours boundaries, so poll (and refetch on focus)
    // to keep the badge current without a socket for this low-traffic view.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useScreenDevice(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: screenDeviceQueryKey(organizationId, id ?? ''),
    queryFn: (): Promise<ScreenDevice | null> =>
      id ? screensApi.getDevice(id) : Promise.resolve(null),
    enabled: Boolean(organizationId && id),
    // Online/last-seen is now driven live by the realtime presence socket
    // (see PresenceProvider); this query only seeds the initial snapshot.
  })
}

export function usePairScreenDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      screensApi.pairDevice(id, { code }),
    onSuccess: (data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      queryClient.setQueryData<ScreenDevice | null>(
        screenDeviceQueryKey(organizationId, variables.id),
        data,
      )
    },
  })
}

export function useUnpairScreenDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => screensApi.unpairDevice(id),
    onSuccess: (_data, id) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      // Flip the tab to "unpaired" instantly, then reconcile with the server.
      const unpaired: ScreenDevice = { paired: false, online: false }
      queryClient.setQueryData<ScreenDevice | null>(
        screenDeviceQueryKey(organizationId, id),
        unpaired,
      )
      void queryClient.invalidateQueries({
        queryKey: screenDeviceQueryKey(organizationId, id),
      })
    },
  })
}

/**
 * Patches the device-detail cache with ONLY the field(s) a single settings PATCH
 * changed — never the whole response.
 *
 * This is what makes concurrent display saves (volume + orientation + scale via
 * Promise.all) order-independent: each PATCH returns a full snapshot that is
 * authoritative only for its own field (its siblings reflect a read taken before
 * the other writes committed). If we wrote the whole response, the last-resolving
 * mutation could clobber a just-applied sibling with that stale value. Applying
 * only the owned field means every save sticks regardless of completion order.
 */
function patchDevice(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  patch: { volume?: number; settings?: Partial<ScreenDeviceSettings> },
) {
  const organizationId = useOrganizationStore.getState().activeOrganizationId
  queryClient.setQueryData<ScreenDevice | null>(
    screenDeviceQueryKey(organizationId, id),
    (current) => {
      if (!current) return current
      return {
        ...current,
        ...(patch.volume !== undefined ? { volume: patch.volume } : {}),
        ...(patch.settings
          ? {
              settings: {
                ...(current.settings ?? DEFAULT_DEVICE_SETTINGS),
                ...patch.settings,
              },
            }
          : {}),
      }
    },
  )
}

export function useSetDeviceVolume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, volume }: { id: string; volume: number }) =>
      screensApi.setDeviceVolume(id, volume),
    onSuccess: (_data, variables) => {
      patchDevice(queryClient, variables.id, { volume: variables.volume })
    },
  })
}

export function useSetDeviceOrientation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      orientation,
    }: {
      id: string
      orientation: ScreenDeviceOrientation
    }) => screensApi.setDeviceOrientation(id, orientation),
    onSuccess: (_data, variables) => {
      patchDevice(queryClient, variables.id, {
        settings: { orientation: variables.orientation },
      })
    },
  })
}

export function useSetDeviceScale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, scale }: { id: string; scale: ScreenDeviceScale }) =>
      screensApi.setDeviceScale(id, scale),
    onSuccess: (_data, variables) => {
      patchDevice(queryClient, variables.id, {
        settings: { scale: variables.scale },
      })
    },
  })
}

export function useSetDeviceDailyReload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: SetDeviceDailyReloadRequest
    }) => screensApi.setDeviceDailyReload(id, payload),
    onSuccess: (_data, variables) => {
      patchDevice(queryClient, variables.id, {
        settings: { dailyReload: variables.payload },
      })
    },
  })
}

/** Restart is a fire-and-forget command — no cache to update. */
export function useRestartDevice() {
  return useMutation({
    mutationFn: (id: string) => screensApi.restartDevice(id),
  })
}

/**
 * Steps the live display to the next/previous content item. Fire-and-forget —
 * the result is observed in the preview iframe, not the React Query cache.
 */
export function useStepDevice() {
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'next' | 'prev' }) =>
      screensApi.stepDevice(id, direction),
  })
}

export function useCreateScreen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateScreenRequest) => screensApi.create(payload),
    onSuccess: () => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
    },
  })
}

export function useUpdateScreen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateScreenRequest }) =>
      screensApi.update(id, payload),
    onSuccess: (data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      queryClient.setQueryData<Screen | null>(
        screenDetailQueryKey(organizationId, variables.id),
        (current) => (current ? { ...current, ...data } : current),
      )
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
    },
  })
}

export function useUpdateScreenAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateScreenAvailabilityRequest }) =>
      screensApi.updateAvailability(id, payload),
    onSuccess: (data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      queryClient.setQueryData<ScreenAvailability | null>(
        screenAvailabilityQueryKey(organizationId, variables.id),
        data,
      )
      // The on/off status is derived server-side from the new rule, so refetch
      // it to update the Screen on/off badge immediately instead of on the next
      // poll.
      void queryClient.invalidateQueries({
        queryKey: screenStatusQueryKey(organizationId, variables.id),
      })
    },
  })
}

export function useDeleteScreens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => screensApi.delete(ids),
    onSuccess: (_data, ids) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
      ids.forEach((id) => {
        queryClient.removeQueries({
          queryKey: screenDetailQueryKey(organizationId, id),
        })
      })
    },
  })
}

export function useReplaceScreenItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReplaceScreenItemsRequest }) =>
      screensApi.replaceItems(id, payload),
    onSuccess: (saved, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      // The server returns the canonical screen (items + derived fields), so
      // seed the detail cache directly and only invalidate the list (for
      // summary/ordering). The detail key is left untouched to avoid an
      // immediate refetch that would discard fresh data.
      queryClient.setQueryData<Screen | null>(
        screenDetailQueryKey(organizationId, variables.id),
        saved,
      )
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
    },
    onError: (error, variables) => {
      // On a concurrent-edit conflict, reload the detail so the editor resyncs
      // to the server's latest state. The component surfaces the toast.
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        const organizationId = useOrganizationStore.getState().activeOrganizationId
        void queryClient.invalidateQueries({
          queryKey: screenDetailQueryKey(organizationId, variables.id),
        })
      }
    },
  })
}

export function useSetScreenLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, layout }: { id: string; layout: ScreenLayout }) =>
      screensApi.setLayout(id, { layout }),
    onSuccess: (saved, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      // Same shape as replaceItems: the server returns the canonical screen.
      queryClient.setQueryData<Screen | null>(
        screenDetailQueryKey(organizationId, variables.id),
        saved,
      )
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
    },
  })
}

export function useAddMediaToScreens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddMediaToScreensRequest) => screensApi.addMedia(payload),
    onSuccess: (_data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
      variables.screenIds.forEach((screenId) => {
        queryClient.removeQueries({
          queryKey: screenDetailQueryKey(organizationId, screenId),
        })
      })
    },
  })
}

export function useAddPlaylistsToScreens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddPlaylistsToScreensRequest) => screensApi.addPlaylists(payload),
    onSuccess: (_data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
      variables.screenIds.forEach((screenId) => {
        queryClient.removeQueries({
          queryKey: screenDetailQueryKey(organizationId, screenId),
        })
      })
    },
  })
}

export function useAddAppsToScreens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddAppsToScreensRequest) => screensApi.addApps(payload),
    onSuccess: (_data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
      variables.screenIds.forEach((screenId) => {
        queryClient.removeQueries({
          queryKey: screenDetailQueryKey(organizationId, screenId),
        })
      })
    },
  })
}
