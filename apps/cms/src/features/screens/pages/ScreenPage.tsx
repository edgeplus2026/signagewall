import { useTranslation } from 'react-i18next'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ContentEditorSkeleton } from '@/features/content/components/ContentEditorSkeleton'
import { OpenWebPlayerButton } from '@/features/screens/components/OpenWebPlayerButton'
import { ScreenAvailabilityBadge } from '@/features/screens/components/ScreenAvailabilityBadge'
import { ScreenAvailabilityTab } from '@/features/screens/components/ScreenAvailabilityTab'
import { ScreenBreadcrumb } from '@/features/screens/components/ScreenBreadcrumb'
import { ScreenContentTab } from '@/features/screens/components/ScreenContentTab'
import { ScreenDeviceTab } from '@/features/screens/components/ScreenDeviceTab'
import { ScreenPresenceBadge } from '@/features/screens/components/ScreenPresenceBadge'
import { ScreenSettingsTab } from '@/features/screens/components/ScreenSettingsTab'
import {
  useScreen,
  useScreenAvailability,
  useScreenDevice,
  useScreenStatus,
} from '@/features/screens/hooks/useScreens'
import { useScreenPresence } from '@/features/screens/providers/presenceContext'
import type { ScreenManageTab } from '@/features/screens/types/screen.types'
import { cn } from '@/lib/utils'

function getActiveTab(tab: string | null): ScreenManageTab {
  if (tab === 'settings') return 'settings'
  if (tab === 'availability') return 'availability'
  if (tab === 'device') return 'device'
  return 'content'
}

export default function ScreenPage() {
  const { t } = useTranslation()
  const { screenId } = useParams<{ screenId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = getActiveTab(searchParams.get('tab'))
  const { data: screen, isLoading } = useScreen(screenId ?? null)
  const { data: availability, isLoading: isAvailabilityLoading } = useScreenAvailability(
    screenId ?? null,
  )
  // Prefer the live socket presence; fall back to the REST snapshot so a
  // freshly-paired device shows status before the next socket push.
  const livePresence = useScreenPresence(screenId ?? undefined)
  const { data: deviceSnapshot } = useScreenDevice(screenId ?? null)
  const presence = livePresence ?? deviceSnapshot ?? undefined
  const { data: availabilityStatus } = useScreenStatus(screenId ?? null)
  const isContentTab = activeTab === 'content'

  if (!screenId) {
    return <Navigate to="/screens" replace />
  }

  const breadcrumbName = isLoading ? undefined : (screen?.name ?? t('screens.manage.notFound'))

  if (isLoading) {
    return (
      <>
        <ScreenBreadcrumb />
        <div
          className={cn(
            'flex w-full min-w-0 flex-col gap-4 lg:px-10',
            isContentTab ? 'h-[calc(100dvh-5.5rem)]' : 'pb-6',
          )}
        >
          <Skeleton className="h-8 w-44 shrink-0 rounded-md" />
          {isContentTab ? (
            <ContentEditorSkeleton />
          ) : (
            <Skeleton className="min-h-96 w-full rounded-xl" />
          )}
        </div>
      </>
    )
  }

  if (!screen) {
    return (
      <>
        <ScreenBreadcrumb screenName={breadcrumbName} />
        <div className="flex w-full min-w-0 flex-col gap-4 lg:px-10">
          <p className="text-secondary text-sm">{t('screens.manage.notFound')}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <ScreenBreadcrumb screenName={breadcrumbName} />
      <div
        className={cn(
          'flex w-full min-w-0 flex-col gap-4 lg:px-10',
          isContentTab ? 'h-[calc(100dvh-5.5rem)]' : 'pb-6',
        )}
      >
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const nextTab = value as ScreenManageTab
            if (
              nextTab === 'settings' ||
              nextTab === 'availability' ||
              nextTab === 'device'
            ) {
              setSearchParams({ tab: nextTab })
            } else {
              setSearchParams({})
            }
          }}
          className={cn('flex min-h-0 flex-1 flex-col gap-4', isContentTab && 'overflow-hidden')}
        >
          <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="line" className="w-fit shrink-0">
              <TabsTrigger value="content">{t('screens.manage.tabs.content')}</TabsTrigger>
              <TabsTrigger value="device">{t('screens.manage.tabs.device')}</TabsTrigger>
              <TabsTrigger value="availability">{t('screens.manage.tabs.availability')}</TabsTrigger>
              <TabsTrigger value="settings">{t('screens.manage.tabs.settings')}</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 sm:ml-auto">
              <OpenWebPlayerButton
                screenId={screenId}
                paired={Boolean(deviceSnapshot?.deviceId)}
                deviceOnline={Boolean(presence?.online)}
              />
              <ScreenAvailabilityBadge status={availabilityStatus ?? undefined} />
              <ScreenPresenceBadge device={presence} />
            </div>
          </div>

          <div
            className={cn(
              'min-h-0 flex-1',
              isContentTab ? 'flex flex-col overflow-hidden' : 'visible-scrollbar overflow-y-auto',
            )}
          >
            <TabsContent
              value="content"
              className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
            >
              <ScreenContentTab key={screen.id} screen={screen} />
            </TabsContent>

            <TabsContent value="device" className="mt-0">
              <ScreenDeviceTab key={screen.id} screenId={screen.id} />
            </TabsContent>

            <TabsContent value="availability" className="mt-0">
              <ScreenAvailabilityTab
                key={screen.id}
                screenId={screen.id}
                availability={availability ?? undefined}
                isLoading={isAvailabilityLoading}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <ScreenSettingsTab screen={screen} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  )
}
