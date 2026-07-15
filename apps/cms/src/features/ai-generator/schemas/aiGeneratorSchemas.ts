import type { TFunction } from 'i18next'
import { z } from 'zod'

/**
 * The wizard form. Select fields are validated as non-empty strings (the actual
 * allow-list lives in the shared `@edge/apps-contract` options and is re-checked
 * by the backend DTO). `keyPoints` is a free-text area, one point per line, that
 * is split into an array on submit. No duration / slide-count fields by design.
 */
export function createAiGeneratorSchema(t: TFunction) {
  return z.object({
    industry: z.string().min(1, t('aiGenerator.validation.industryRequired')),
    businessName: z
      .string()
      .trim()
      .max(120, t('aiGenerator.validation.businessNameMax'))
      .optional(),
    targetAudience: z
      .string()
      .trim()
      .max(200, t('aiGenerator.validation.targetAudienceMax'))
      .optional(),
    primaryGoal: z.string().min(1, t('aiGenerator.validation.goalRequired')),
    tone: z.string().min(1, t('aiGenerator.validation.toneRequired')),
    language: z.string().min(1, t('aiGenerator.validation.languageRequired')),
    keyPoints: z
      .string()
      .max(2000, t('aiGenerator.validation.keyPointsMax'))
      .optional(),
  })
}

export type AiGeneratorFormValues = z.infer<
  ReturnType<typeof createAiGeneratorSchema>
>
