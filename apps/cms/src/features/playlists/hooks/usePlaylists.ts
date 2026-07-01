import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { playlistsApi } from '@/features/playlists/api/playlistsApi'
import {
  playlistDetailQueryKey,
  playlistScreensQueryKey,
  playlistsQueryKey,
} from '@/features/playlists/lib/playlistQueryKeys'
import type {
  AddAppsToPlaylistsRequest,
  AddMediaToPlaylistsRequest,
  CreatePlaylistRequest,
  Playlist,
  ReplacePlaylistItemsRequest,
  UpdatePlaylistRequest,
} from '@/features/playlists/types/playlist.types'
import { screensQueryKey } from '@/features/screens/lib/screenQueryKeys'
import { ApiError } from '@/lib/api-error'

function invalidatePlaylists(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string | null | undefined,
  playlistId?: string,
) {
  // `exact: true` so the list key doesn't prefix-match (and needlessly refetch)
  // the detail queries nested under it. Detail invalidation is explicit below.
  void queryClient.invalidateQueries({
    queryKey: playlistsQueryKey(organizationId),
    exact: true,
  })
  if (playlistId) {
    void queryClient.invalidateQueries({
      queryKey: playlistDetailQueryKey(organizationId, playlistId),
    })
  }
}

function useActiveOrganizationId() {
  return useOrganizationStore((state) => state.activeOrganizationId)
}

export function usePlaylists() {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: playlistsQueryKey(organizationId),
    queryFn: playlistsApi.list,
    enabled: Boolean(organizationId),
  })
}

export function usePlaylist(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: playlistDetailQueryKey(organizationId, id ?? ''),
    queryFn: async (): Promise<Playlist | null> => {
      if (!id) return null

      const [detail, items] = await Promise.all([
        playlistsApi.get(id),
        // Tolerate a missing playlist here; `detail` being null is the
        // canonical "not found" signal and short-circuits below.
        playlistsApi.getItems(id).catch((error: unknown) => {
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

export function usePlaylistScreens(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: playlistScreensQueryKey(organizationId, id ?? ''),
    queryFn: () => (id ? playlistsApi.getScreensUsing(id) : []),
    enabled: Boolean(organizationId && id),
    staleTime: 0,
  })
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePlaylistRequest) => playlistsApi.create(payload),
    onSuccess: () => {
      invalidatePlaylists(queryClient, useOrganizationStore.getState().activeOrganizationId)
    },
  })
}

export function useUpdatePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlaylistRequest }) =>
      playlistsApi.update(id, payload),
    onSuccess: (data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      queryClient.setQueryData<Playlist | null>(
        playlistDetailQueryKey(organizationId, variables.id),
        (current) => (current ? { ...current, ...data } : current),
      )
      invalidatePlaylists(queryClient, organizationId, variables.id)
    },
  })
}

export function useDeletePlaylists() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => playlistsApi.delete(ids),
    onSuccess: () => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      invalidatePlaylists(queryClient, organizationId)
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
      queryClient.removeQueries({
        queryKey: [...screensQueryKey(organizationId), 'detail'],
      })
    },
  })
}

export function useDuplicatePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, copySuffix }: { id: string; copySuffix: string }) =>
      playlistsApi.duplicate(id, { copySuffix }),
    onSuccess: () => {
      invalidatePlaylists(queryClient, useOrganizationStore.getState().activeOrganizationId)
    },
  })
}

export function useReplacePlaylistItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReplacePlaylistItemsRequest }) =>
      playlistsApi.replaceItems(id, payload),
    onSuccess: (saved, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      // The server returns the canonical playlist (items + derived fields), so
      // seed the detail cache directly — no client-side recompute — and only
      // invalidate the list (for summary/ordering). The detail key is left
      // untouched to avoid an immediate refetch that would discard fresh data.
      queryClient.setQueryData<Playlist | null>(
        playlistDetailQueryKey(organizationId, variables.id),
        saved,
      )
      void queryClient.invalidateQueries({
        queryKey: playlistsQueryKey(organizationId),
        exact: true,
      })
    },
    onError: (error, variables) => {
      // On a concurrent-edit conflict, reload the detail so the editor resyncs
      // to the server's latest state. The component surfaces the toast.
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        const organizationId = useOrganizationStore.getState().activeOrganizationId
        void queryClient.invalidateQueries({
          queryKey: playlistDetailQueryKey(organizationId, variables.id),
        })
      }
    },
  })
}

export function useAddMediaToPlaylists() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddMediaToPlaylistsRequest) => playlistsApi.addMedia(payload),
    onSuccess: (_data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      // The targeted playlists' items/derived fields changed. Refresh the list
      // summaries, and drop each affected detail cache so the next visit
      // refetches fresh items (the detail is typically not mounted while adding
      // from elsewhere, so invalidation alone wouldn't refetch it). Removing an
      // active detail query refetches it immediately.
      void queryClient.invalidateQueries({
        queryKey: playlistsQueryKey(organizationId),
        exact: true,
      })
      variables.playlistIds.forEach((playlistId) => {
        queryClient.removeQueries({
          queryKey: playlistDetailQueryKey(organizationId, playlistId),
        })
      })
    },
  })
}

export function useAddAppsToPlaylists() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddAppsToPlaylistsRequest) => playlistsApi.addApps(payload),
    onSuccess: (_data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: playlistsQueryKey(organizationId),
        exact: true,
      })
      variables.playlistIds.forEach((playlistId) => {
        queryClient.removeQueries({
          queryKey: playlistDetailQueryKey(organizationId, playlistId),
        })
      })
    },
  })
}
