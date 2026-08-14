import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { OnboardingRing } from '@/features/onboarding/components/OnboardingRing'
import { useOnboarding } from '@/features/onboarding/hooks/useOnboarding'
import { useOnboardingUiStore } from '@/features/onboarding/store/onboardingUiStore'

/**
 * Permanent "where am I in setup" indicator in the app header, and the way back
 * to the checklist once it has been minimized.
 *
 * It disappears for good the moment onboarding is finished or dismissed —
 * an established customer should not carry a setup widget around forever.
 */
export function OnboardingHeaderButton() {
  const { t } = useTranslation()
  const { data } = useOnboarding()
  const open = useOnboardingUiStore((state) => state.open)
  const toggleOpen = useOnboardingUiStore((state) => state.toggleOpen)

  if (!data || data.status === 'dismissed') {
    return null
  }

  if (data.status === 'completed' && !data.showCelebration) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleOpen}
      aria-expanded={open}
      title={t('onboarding.header.tooltip')}
      className="gap-2"
    >
      <OnboardingRing percent={data.percent} size={17} />
      <span className="hidden sm:inline">{t('onboarding.header.label')}</span>
      <span className="text-secondary text-xs tabular-nums">
        {data.completedCount}/{data.totalCount}
      </span>
    </Button>
  )
}
