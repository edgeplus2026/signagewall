import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { mediaApi } from "@/features/media/api/mediaApi"
import type {
  CreateFolderRequest,
  MediaListParams,
  MoveMediaRequest,
  UpdateMediaRequest,
} from "@/features/media/types/media.types"
import { useOrganizationStore } from "@/features/organizations/store/organizationStore"
import { playlistsQueryKey } from "@/features/playlists/lib/playlistQueryKeys"
import { screensQueryKey } from "@/features/screens/lib/screenQueryKeys"

const MEDIA_QUERY_KEY = ["media"] as const

export function useMediaItems(params: MediaListParams) {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, "list", params],
    queryFn: () => mediaApi.list(params),
  })
}

export function useMediaFiles(parentId: string | null) {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, "media", parentId],
    queryFn: () => mediaApi.listMedia({ parentId }),
  })
}

export function useFolders(parentId: string | null) {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, "folders", parentId],
    queryFn: () => mediaApi.listFolders(parentId),
  })
}

export function useAllFolders() {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, "all-folders"],
    queryFn: () => mediaApi.listAllFolders(),
  })
}

export function useAllMediaFiles() {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, "all-files"],
    queryFn: () => mediaApi.listAllMediaFiles(),
  })
}

export function useFolderPath(folderId: string | null) {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, "path", folderId],
    queryFn: () => mediaApi.getFolderPath(folderId),
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateFolderRequest) =>
      mediaApi.createFolder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
  })
}

export function useMediaItem(id: string | null) {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, "item", id],
    queryFn: () => {
      if (!id) return null
      return mediaApi.get(id)
    },
    enabled: !!id,
  })
}

export function useUpdateMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateMediaRequest
    }) => mediaApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
  })
}

export function useMoveMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MoveMediaRequest) => mediaApi.move(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => mediaApi.delete(ids),
    onSuccess: () => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: playlistsQueryKey(organizationId),
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
      // Media may have been removed from playlist/screen item arrays server-side.
      queryClient.removeQueries({
        queryKey: [...playlistsQueryKey(organizationId), "detail"],
      })
      queryClient.removeQueries({
        queryKey: [...screensQueryKey(organizationId), "detail"],
      })
    },
  })
}
