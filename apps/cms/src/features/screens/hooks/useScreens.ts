import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { screensApi } from '@/features/screens/api/screensApi'
import {
  screenAvailabilityQueryKey,
  screenDetailQueryKey,
  screensQueryKey,
} from '@/features/screens/lib/screenQueryKeys'
import type {
  AddMediaToScreensRequest,
  AddPlaylistsToScreensRequest,
  CreateScreenRequest,
  ReplaceScreenItemsRequest,
  Screen,
  ScreenAvailability,
  UpdateScreenAvailabilityRequest,
  UpdateScreenRequest,
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
