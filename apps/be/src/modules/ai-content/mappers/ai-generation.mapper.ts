import type {
  AiGeneratedContent,
  AiGenerationInput,
} from '@edge/apps-contract';

import {
  AiGenerationDocument,
  AiGenerationStatus,
} from '../schemas/ai-generation.schema';

export interface AiGenerationResponseDto {
  id: string;
  status: AiGenerationStatus;
  input: AiGenerationInput;
  result?: AiGeneratedContent;
  error?: string;
  playlistId?: string;
  createdAt: string;
}

export function toAiGenerationResponse(
  doc: AiGenerationDocument,
): AiGenerationResponseDto {
  return {
    id: doc._id.toString(),
    status: doc.status,
    input: doc.input,
    ...(doc.result ? { result: doc.result } : {}),
    ...(doc.error ? { error: doc.error } : {}),
    ...(doc.playlistId ? { playlistId: doc.playlistId.toString() } : {}),
    createdAt: doc.createdAt.toISOString(),
  };
}
