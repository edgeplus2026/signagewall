import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { OnboardingRing } from '@/features/onboarding/components/OnboardingRing'
import {
  useOnboarding,
  useUpdateOnboarding,
} from '@/features/onboarding/hooks/useOnboarding'
import { useOnboardingUiStore } from '@/features/onboarding/store/onboardingUiStore'

/**
 * The setup indicator in the app header, and the only way back to the checklist.
 *
 * It stays put for the whole of onboarding — minimizing the panel or closing it
 * with the X hides the floating card, never this. Losing the entry point would
 * make closing the card irreversible, which is not what a close button means.
 * It retires only once every step is genuinely done and the user has seen that.
 */
export function OnboardingHeaderButton() {
  const { t } = useTranslation()
  const { data } = useOnboarding()
  const update = useUpdateOnboarding()
  const open = useOnboardingUiStore((state) => state.open)
  const setOpen = useOnboardingUiStore((state) => state.setOpen)
  const toggleOpen = useOnboardingUiStore((state) => state.toggleOpen)

  if (!data) {
    return null
  }

  if (data.status === 'completed' && !data.showCelebration) {
    return null
  }

  const dismissed = data.status === 'dismissed'

  const handleClick = () => {
    // Closed with the X: bring the card back rather than toggling a panel the
    // user can no longer see.
    if (dismissed) {
      update.mutate({ dismissed: false })
      setOpen(true)
      return
    }

    toggleOpen()
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      aria-expanded={open && !dismissed}
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
