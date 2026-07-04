import type {
  AiGenerationJob,
  AiGenerationPlaylistResponse,
  CreateAiGenerationPlaylistRequest,
  CreateAiGenerationRequest,
} from '../types/aiGenerator.types'

import { api } from '@/lib/axios'


const BASE = '/ai-content/generations'

export const aiGeneratorApi = {
  list: async (): Promise<AiGenerationJob[]> => {
    const { data } = await api.get<AiGenerationJob[]>(BASE)
    return data
  },

  create: async (
    payload: CreateAiGenerationRequest,
  ): Promise<AiGenerationJob> => {
    const { data } = await api.post<AiGenerationJob>(BASE, payload)
    return data
  },

  get: async (id: string): Promise<AiGenerationJob> => {
    const { data } = await api.get<AiGenerationJob>(`${BASE}/${id}`)
    return data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/${id}`)
  },

  createPlaylist: async (
    id: string,
    payload: CreateAiGenerationPlaylistRequest,
  ): Promise<AiGenerationPlaylistResponse> => {
    const { data } = await api.post<AiGenerationPlaylistResponse>(
      `${BASE}/${id}/playlist`,
      payload,
    )
    return data
  },
}
