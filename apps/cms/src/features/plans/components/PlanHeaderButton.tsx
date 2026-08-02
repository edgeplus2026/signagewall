import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { usePlan } from '@/features/plans/hooks/usePlan'
import { usePlanDialogStore } from '@/features/plans/store/planDialogStore'
import { cn } from '@/lib/utils'

/**
 * The permanent call to action in the app header.
 *
 * Free accounts get "Upgrade plan" plus a countdown, because their data is on a
 * clock. Enterprise accounts get "Request more licences" only once they have
 * actually run out — a customer inside their allowance has nothing to ask for,
 * and a button that nags them anyway reads as a dark pattern.
 */
export function PlanHeaderButton() {
  const { t } = useTranslation()
  const { data: plan } = usePlan()
  const openDialog = usePlanDialogStore((state) => state.openDialog)

  if (!plan || plan.isSponsored) {
    return null
  }

  const isFree = plan.plan === 'free'
  const atLimit = !plan.canCreateScreen

  if (!isFree && !atLimit) {
    return null
  }

  const daysLeft = plan.trialDaysLeft
  // Under a week the countdown turns red — the point of a trial banner is that
  // it becomes hard to ignore as the deadline gets close.
  const isUrgent = isFree && daysLeft !== null && daysLeft <= 7

  return (
    <div className="flex items-center gap-2">
      {isFree && daysLeft !== null ? (
        <span
          className={cn(
            'hidden items-center rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline-flex',
            isUrgent ? 'bg-danger/10 text-danger' : 'bg-secondary/10 text-secondary',
          )}
        >
          {daysLeft === 0
            ? t('plans.trial.endsToday')
            : t('plans.trial.daysLeft', { count: daysLeft })}
        </span>
      ) : null}

      <Button
        size="sm"
        variant={isFree || atLimit ? 'default' : 'outline'}
        onClick={() => {
          openDialog('header')
        }}
      >
        <SparklesIcon />
        {isFree ? t('plans.upgrade.cta') : t('plans.licences.cta')}
      </Button>
    </div>
  )
}
