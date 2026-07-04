/**
 * Shared option lists for the AI content generator's multi-step form. Defined
 * once here so the CMS (select options + form validation) and the backend (DTO
 * allow-list + request record) agree on exactly the same values — no
 * hand-mirrored enums that can drift apart.
 *
 * These are business-context choices only. Deliberately absent: playlist
 * duration and slide/clip count — those are defaulted server-side, never asked.
 */

/** Industry the content is for. `other` is the escape hatch. */
export const INDUSTRIES = [
  'retail',
  'hospitality',
  'restaurant',
  'cafe',
  'healthcare',
  'fitness',
  'beauty',
  'realEstate',
  'automotive',
  'education',
  'technology',
  'finance',
  'events',
  'nonprofit',
  'other',
] as const
export type Industry = (typeof INDUSTRIES)[number]

/** What the generated content is trying to achieve. */
export const GOALS = [
  'promotion',
  'announcement',
  'event',
  'awareness',
  'welcome',
  'info',
] as const
export type ContentGoal = (typeof GOALS)[number]

/** Voice / style of the copy. */
export const TONES = [
  'professional',
  'friendly',
  'energetic',
  'playful',
  'luxurious',
  'minimal',
] as const
export type ContentTone = (typeof TONES)[number]

/** Output language. Mirrors the app's supported UI languages. */
export const LANGUAGES = ['en', 'sr'] as const
export type ContentLanguage = (typeof LANGUAGES)[number]
