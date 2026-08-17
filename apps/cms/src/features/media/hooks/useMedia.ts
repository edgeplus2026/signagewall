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

function useActiveOrganizationId() {
  return useOrganizationStore((state) => state.activeOrganizationId)
}

/**
 * Media queries are organization-scoped like their screens/playlists siblings:
 * the org id is part of the key so switching orgs cannot serve the previous
 * org's library from cache, and `enabled` keeps the request from firing before
 * an org is selected (which would 400 and cache a failure).
 *
 * The org id sits after the `"media"` root on purpose — every
 * `invalidateQueries({ queryKey: MEDIA_QUERY_KEY })` below is a prefix match
 * and keeps working unchanged.
 */
export function useMediaItems(params: MediaListParams) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, organizationId, "list", params],
    queryFn: () => mediaApi.list(params),
    enabled: Boolean(organizationId),
  })
}

export function useMediaFiles(parentId: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, organizationId, "media", parentId],
    queryFn: () => mediaApi.listMedia({ parentId }),
    enabled: Boolean(organizationId),
  })
}

export function useFolders(parentId: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, organizationId, "folders", parentId],
    queryFn: () => mediaApi.listFolders(parentId),
    enabled: Boolean(organizationId),
  })
}

export function useAllFolders() {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, organizationId, "all-folders"],
    queryFn: () => mediaApi.listAllFolders(),
    enabled: Boolean(organizationId),
  })
}

export function useAllMediaFiles() {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, organizationId, "all-files"],
    queryFn: () => mediaApi.listAllMediaFiles(),
    enabled: Boolean(organizationId),
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
