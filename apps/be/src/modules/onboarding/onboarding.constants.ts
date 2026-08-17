/**
 * The first-run checklist, in the order a new customer should work through it.
 *
 * Every step is *derived* from real content rather than ticked off by the CMS:
 * a checklist that can be marked done without the work having happened is worth
 * nothing, and a user who uploaded media through the app catalogue or a cloud
 * import must not be asked to do it again.
 */
export const ONBOARDING_STEP_KEYS = [
  /** At least one image or video in the library (folders don't count). */
  'media',
  /** At least one playlist exists. */
  'playlist',
  /** At least one screen exists. */
  'screen',
  /** A device has been paired to one of those screens. */
  'pair',
  /** At least one screen actually has something to play. */
  'assign',
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

export type OnboardingStatus = 'active' | 'completed' | 'dismissed';
