import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useScreens } from '../hooks/useScreens'

import { usePlan } from '@/features/plans/hooks/usePlan'
import { usePlanDialogStore } from '@/features/plans/store/planDialogStore'
import { ScreenFormSheet } from '@/features/screens/components/ScreenFormSheet'
import { ScreensBrowser } from '@/features/screens/components/ScreensBrowser'
import { cn } from '@/lib/utils'

export default function ScreensPage() {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: plan } = usePlan()
  const openPlanDialog = usePlanDialogStore((state) => state.openDialog)

  const { data: screens = [], isLoading, isError, refetch } = useScreens()

  // Known to be out of licences: skip the create form entirely. The API would
  // refuse the submit anyway, and a form that cannot succeed wastes the user's
  // time. Unknown plan (still loading) opens the form — the API is the gate.
  const atScreenLimit = plan ? !plan.canCreateScreen : false

  const handleCreateClick = () => {
    if (atScreenLimit) {
      openPlanDialog('screens')
      return
    }
    setCreateOpen(true)
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-primary text-xl font-medium tracking-tight">
            {t('screens.title')}
          </h1>
          <span
            className={cn(
              'bg-success/10 text-success inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
            )}
          >
            {t('screens.screenCount', { count: screens.length })}
          </span>
          {plan && !plan.isSponsored && plan.screenLimit !== null ? (
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
                atScreenLimit
                  ? 'bg-danger/10 text-danger'
                  : 'bg-secondary/10 text-secondary',
              )}
            >
              {t('plans.screenUsage', {
                used: plan.screensUsed,
                limit: plan.screenLimit,
              })}
            </span>
          ) : null}
        </div>
        <p className="text-secondary text-sm">{t('screens.description')}</p>
      </div>

      <ScreensBrowser
        screens={screens}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onCreateClick={handleCreateClick}
      />

      <ScreenFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
