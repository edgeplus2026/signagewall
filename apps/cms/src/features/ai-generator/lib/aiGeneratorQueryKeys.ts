export const AI_GENERATION_QUERY_ROOT = 'ai-generation' as const

/** The user's generation history (the record of what was entered + results). */
export function aiGenerationsListQueryKey(
  organizationId: string | null | undefined,
) {
  return [AI_GENERATION_QUERY_ROOT, organizationId ?? 'none', 'list'] as const
}

export function aiGenerationQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [AI_GENERATION_QUERY_ROOT, organizationId ?? 'none', id] as const
}
