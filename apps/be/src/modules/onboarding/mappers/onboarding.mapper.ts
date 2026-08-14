import {
  OnboardingStatus,
  OnboardingStepKey,
  ONBOARDING_STEP_KEYS,
} from '../onboarding.constants';
import { OnboardingProgressDocument } from '../schemas/onboarding-progress.schema';

export interface OnboardingStepDto {
  key: OnboardingStepKey;
  done: boolean;
}

/** Everything the CMS needs to draw the header ring and the checklist panel. */
export interface OnboardingStateDto {
  steps: OnboardingStepDto[];
  completedCount: number;
  totalCount: number;
  /** 0–100, rounded. Drives the progress ring. */
  percent: number;
  /** First unfinished step — what the panel opens on. `null` when finished. */
  currentStep: OnboardingStepKey | null;
  status: OnboardingStatus;
  completedAt: string | null;
  /**
   * Finished, but the user has not been shown that yet. The CMS keeps the
   * checklist visible for exactly one visit so the completion state is seen.
   */
  showCelebration: boolean;
}

export const toOnboardingState = (
  done: Record<OnboardingStepKey, boolean>,
  progress: OnboardingProgressDocument | null,
): OnboardingStateDto => {
  const steps = ONBOARDING_STEP_KEYS.map((key) => ({ key, done: done[key] }));
  const completedCount = steps.filter((step) => step.done).length;
  const totalCount = steps.length;
  const allDone = completedCount === totalCount;

  const dismissed = Boolean(progress?.dismissedAt);
  const status: OnboardingStatus = dismissed
    ? 'dismissed'
    : allDone
      ? 'completed'
      : 'active';

  return {
    steps,
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    currentStep: steps.find((step) => !step.done)?.key ?? null,
    status,
    completedAt: progress?.completedAt?.toISOString() ?? null,
    showCelebration:
      allDone && !dismissed && !progress?.completionAcknowledgedAt,
  };
};
