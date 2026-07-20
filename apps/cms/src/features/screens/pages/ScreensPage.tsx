import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useScreens } from '../hooks/useScreens'

import { ScreenFormSheet } from '@/features/screens/components/ScreenFormSheet'
import { ScreensBrowser } from '@/features/screens/components/ScreensBrowser'
import { cn } from '@/lib/utils'

export default function ScreensPage() {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: screens = [], isLoading } = useScreens()

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
        </div>
        <p className="text-secondary text-sm">{t('screens.description')}</p>
      </div>

      <ScreensBrowser
        screens={screens}
        isLoading={isLoading}
        onCreateClick={() => {
          setCreateOpen(true)
        }}
      />

      <ScreenFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
