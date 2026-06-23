import { useMutation, useQueryClient } from "@tanstack/react-query"

import { mediaApi } from "@/features/media/api/mediaApi"
import type { ImportCloudMediaRequest } from "@/features/media/types/media.types"

/**
 * Imports cloud-picked items via the backend (which downloads the bytes and
 * persists them). Invalidates the media list so newly imported items appear —
 * the same `["media"]` key the upload pipeline refreshes.
 */
export function useImportCloudMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ImportCloudMediaRequest) =>
      mediaApi.importCloud(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media"] })
    },
  })
}
