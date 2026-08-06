import { ImageIcon, ListVideoIcon, MonitorIcon, WifiIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { QueryErrorState } from '@/components/common/QueryErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/features/auth/store/authStore'
import { ContentGrowthChart } from '@/features/dashboard/components/ContentGrowthChart'
import { DashboardHero } from '@/features/dashboard/components/DashboardHero'
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel'
import { DashboardStatCard } from '@/features/dashboard/components/DashboardStatCard'
import { GettingStarted } from '@/features/dashboard/components/GettingStarted'
import { MediaBreakdownChart } from '@/features/dashboard/components/MediaBreakdownChart'
import { RecentPlaylists } from '@/features/dashboard/components/RecentPlaylists'
import { ScreenStatusChart } from '@/features/dashboard/components/ScreenStatusChart'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'

function DashboardSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:px-10">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-22 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-85 rounded-xl lg:col-span-2" />
        <Skeleton className="h-85 rounded-xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const data = useDashboardData()

  const firstName = user?.name.split(' ')[0]
  const thisWeek = t('dashboard.stats.thisWeek')

  if (data.isLoading) {
    return <DashboardSkeleton />
  }

  if (data.isError) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-6 lg:px-10">
        <QueryErrorState className="min-h-96 py-12" onRetry={data.retry} />
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:px-10">
      <DashboardHero
        userName={firstName}
        online={data.presence.online}
        total={data.presence.total}
      />

      <GettingStarted
        screens={data.counts.screens}
        playlists={data.counts.playlists}
        media={data.counts.media}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label={t('dashboard.stats.screens')}
          value={data.counts.screens}
          icon={MonitorIcon}
          to="/screens"
          delta={data.deltas.screens}
          deltaLabel={thisWeek}
        />
        <DashboardStatCard
          label={t('dashboard.stats.online')}
          value={`${String(data.presence.online)}/${String(data.presence.total)}`}
          icon={WifiIcon}
          to="/screens"
          live={data.presence.online > 0}
        />
        <DashboardStatCard
          label={t('dashboard.stats.playlists')}
          value={data.counts.playlists}
          icon={ListVideoIcon}
          to="/playlists"
          delta={data.deltas.playlists}
          deltaLabel={thisWeek}
        />
        <DashboardStatCard
          label={t('dashboard.stats.media')}
          value={data.counts.media}
          icon={ImageIcon}
          to="/media"
          delta={data.deltas.media}
          deltaLabel={thisWeek}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardPanel
          className="lg:col-span-2"
          title={t('dashboard.charts.growth.title')}
          description={t('dashboard.charts.growth.subtitle')}
        >
          <ContentGrowthChart data={data.growth} />
        </DashboardPanel>
        <DashboardPanel
          title={t('dashboard.screens.title')}
          description={t('dashboard.screens.subtitle')}
        >
          <ScreenStatusChart
            online={data.presence.online}
            offline={data.presence.offline}
            total={data.presence.total}
          />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardPanel
          className="lg:col-span-2"
          title={t('dashboard.recentPlaylists.title')}
          action={
            <Link
              to="/playlists"
              className="text-secondary hover:text-primary text-xs font-medium transition-colors"
            >
              {t('dashboard.recentPlaylists.viewAll')}
            </Link>
          }
        >
          <RecentPlaylists playlists={data.recentPlaylists} />
        </DashboardPanel>
        <DashboardPanel
          title={t('dashboard.media.title')}
          description={t('dashboard.media.subtitle')}
        >
          <MediaBreakdownChart
            images={data.counts.images}
            videos={data.counts.videos}
            storageBytes={data.storageBytes}
          />
        </DashboardPanel>
      </div>
    </div>
  )
}
