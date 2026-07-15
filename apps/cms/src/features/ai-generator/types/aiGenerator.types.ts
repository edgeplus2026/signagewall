import type {
  AiGeneratedContent,
  AiGenerationInput,
} from '@edge/apps-contract'

export type AiGenerationStatus =
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'

/** A generation job as returned by the backend (mirrors the BE response DTO). */
export interface AiGenerationJob {
  id: string
  status: AiGenerationStatus
  input: AiGenerationInput
  result?: AiGeneratedContent
  error?: string
  playlistId?: string
  createdAt: string
}

/** The enqueue request body = the business-context form inputs. */
export type CreateAiGenerationRequest = AiGenerationInput

export interface CreateAiGenerationPlaylistRequest {
  name?: string
}

export interface AiGenerationPlaylistResponse {
  playlistId: string
}
