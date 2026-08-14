import {
  ImageIcon,
  ListVideoIcon,
  MonitorIcon,
  MonitorPlayIcon,
  TabletSmartphoneIcon,
  type LucideIcon,
} from 'lucide-react'

import type { OnboardingStepKey } from '@/features/onboarding/types/onboarding.types'

export interface OnboardingStepConfig {
  key: OnboardingStepKey
  icon: LucideIcon
  /** Where the step's call to action sends the user. */
  to: string
  /**
   * Steps that act on an existing screen deep-link straight to that screen's
   * tab when one is known, instead of dropping the user on the list to hunt.
   */
  screenTab?: 'device' | 'content'
}

/** Presentation for each step; copy lives in `onboarding.steps.*` in i18n. */
export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { key: 'media', icon: ImageIcon, to: '/media' },
  { key: 'playlist', icon: ListVideoIcon, to: '/playlists' },
  { key: 'screen', icon: MonitorIcon, to: '/screens' },
  { key: 'pair', icon: TabletSmartphoneIcon, to: '/screens', screenTab: 'device' },
  { key: 'assign', icon: MonitorPlayIcon, to: '/screens', screenTab: 'content' },
]

export function resolveStepHref(
  step: OnboardingStepConfig,
  firstScreenId: string | null,
): string {
  return step.screenTab && firstScreenId
    ? `/screens/${firstScreenId}?tab=${step.screenTab}`
    : step.to
}
