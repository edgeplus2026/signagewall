import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { aiGeneratorApi } from '../api/aiGeneratorApi'
import {
  aiGenerationQueryKey,
  aiGenerationsListQueryKey,
} from '../lib/aiGeneratorQueryKeys'
import type {
  AiGenerationJob,
  CreateAiGenerationRequest,
} from '../types/aiGenerator.types'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { playlistsQueryKey } from '@/features/playlists/lib/playlistQueryKeys'

function useActiveOrganizationId() {
  return useOrganizationStore((state) => state.activeOrganizationId)
}

/** The current user's generation history (the "table" of past form inputs + results). */
export function useAiGenerations() {
  const organizationId = useActiveOrganizationId()

  return useQuery<AiGenerationJob[]>({
    queryKey: aiGenerationsListQueryKey(organizationId),
    queryFn: aiGeneratorApi.list,
    enabled: Boolean(organizationId),
  })
}

export function useCreateAiGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateAiGenerationRequest) =>
      aiGeneratorApi.create(payload),
    onSuccess: () => {
      const organizationId =
        useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: aiGenerationsListQueryKey(organizationId),
      })
    },
  })
}

/**
 * Polls a generation until it reaches a terminal state. The app-wide realtime
 * listener invalidates this query for near-instant updates; the interval is the
 * resilient fallback if a socket event is missed.
 */
export function useAiGeneration(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery<AiGenerationJob>({
    queryKey: aiGenerationQueryKey(organizationId, id ?? ''),
    queryFn: () => aiGeneratorApi.get(id ?? ''),
    enabled: Boolean(organizationId && id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'succeeded' || status === 'failed' ? false : 2000
    },
  })
}

export function useDeleteAiGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => aiGeneratorApi.remove(id),
    onSuccess: () => {
      const organizationId =
        useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: aiGenerationsListQueryKey(organizationId),
      })
    },
  })
}

export function useCreatePlaylistFromGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      aiGeneratorApi.createPlaylist(id, name ? { name } : {}),
    onSuccess: () => {
      const organizationId =
        useOrganizationStore.getState().activeOrganizationId
      void queryClient.invalidateQueries({
        queryKey: playlistsQueryKey(organizationId),
        exact: true,
      })
    },
  })
}
