/** Mirrors the API's step order — the checklist is rendered in this sequence. */
export const ONBOARDING_STEP_KEYS = [
  'media',
  'playlist',
  'screen',
  'pair',
  'assign',
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number]

export type OnboardingStatus = 'active' | 'completed' | 'dismissed'

export interface OnboardingStep {
  key: OnboardingStepKey
  /** Derived server-side from the organization's content, never self-reported. */
  done: boolean
}

export interface OnboardingState {
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
  percent: number
  currentStep: OnboardingStepKey | null
  status: OnboardingStatus
  completedAt: string | null
  showCelebration: boolean
}

export interface UpdateOnboardingRequest {
  dismissed?: boolean
  completionAcknowledged?: boolean
}
