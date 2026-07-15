import { z } from 'zod'

import { GOALS, INDUSTRIES, LANGUAGES, TONES } from './options.js'

/**
 * Slide-count policy for a generation. The count is NOT collected from the user
 * (the form is business-context only) — it is defaulted server-side. The min/max
 * bounds are what the model's output is validated against, kept generous so a
 * model returning a few more/fewer slides than requested doesn't spuriously fail.
 */
export const AI_CONTENT_MIN_SLIDES = 2
export const AI_CONTENT_MAX_SLIDES = 12
export const AI_CONTENT_DEFAULT_SLIDES = 5

/**
 * The business context the multi-step wizard collects. This is exactly what gets
 * persisted as the generation's `input` (the record of "what the user entered")
 * and what the AI prompt is built from.
 */
export const aiGenerationInputSchema = z.object({
  industry: z.enum(INDUSTRIES),
  businessName: z.string().trim().min(1).max(120).optional(),
  targetAudience: z.string().trim().max(200).optional(),
  primaryGoal: z.enum(GOALS),
  tone: z.enum(TONES),
  /** Optional bullet points the operator wants reflected in the copy. */
  keyPoints: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  language: z.enum(LANGUAGES),
})
export type AiGenerationInput = z.infer<typeof aiGenerationInputSchema>

/**
 * How a slide is composed on screen:
 * - `message` — copy overlaid on a photo (dark scrim for legibility).
 * - `photo` — image-forward: the photo dominates with a short headline only.
 */
export const SLIDE_LAYOUTS = ['message', 'photo'] as const
export type SlideLayout = (typeof SLIDE_LAYOUTS)[number]

/** One generated slide → becomes one `text` app instance on materialization. */
export const aiSlideSchema = z.object({
  layout: z.enum(SLIDE_LAYOUTS).optional(),
  /** Short heading. */
  title: z.string().trim().max(120).optional(),
  /**
   * The message shown on screen. Optional so an image-forward (`photo`) slide
   * can carry little or no copy — every slide still has at least an image.
   */
  body: z.string().trim().max(2000).optional(),
  /** Stock-photo search term the server uses to fetch a background image. */
  imageQuery: z.string().trim().max(120).optional(),
  /** Resolved background image URL, filled server-side after the Pexels search. */
  imageUrl: z.string().url().optional(),
})
export type AiSlide = z.infer<typeof aiSlideSchema>

/**
 * The shape the AI model must return (after the processor strips any prose /
 * code fences and JSON-parses). Validated with {@link aiGeneratedContentSchema};
 * a failure triggers a bounded retry, then the job is marked failed.
 */
export const aiGeneratedContentSchema = z.object({
  slides: z
    .array(aiSlideSchema)
    .min(AI_CONTENT_MIN_SLIDES)
    .max(AI_CONTENT_MAX_SLIDES),
  /** Optional playlist name suggestion; the user can override on create. */
  suggestedName: z.string().trim().max(200).optional(),
})
export type AiGeneratedContent = z.infer<typeof aiGeneratedContentSchema>
