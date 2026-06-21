import { ExternalLinkIcon, MonitorIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { usePlaylistScreens } from '@/features/playlists/hooks/usePlaylists'
import type { ScreenSummary } from '@/features/screens/types/screen.types'
import { SettingsSection } from '@/features/settings/components/SettingsSection'

interface PlaylistScreensUsingProps {
  playlistId: string
}

export function PlaylistScreensUsing({ playlistId }: PlaylistScreensUsingProps) {
  const { t } = useTranslation()
  const { data: screens, isLoading } = usePlaylistScreens(playlistId)

  return (
    <SettingsSection title={t('playlists.usedByScreens.title')}>
      <div className="px-4 py-2">
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <div className="flex items-center gap-3 py-2.5">
                  <Skeleton className="aspect-4/3 h-10 shrink-0 rounded-md" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
                {index < 3 && <div className="border-secondary/30 border-t" />}
              </div>
            ))}
          </div>
        ) : !screens || screens.length === 0 ? (
          <p className="text-secondary py-2 text-sm">{t('playlists.usedByScreens.empty')}</p>
        ) : (
          <div className="flex flex-col">
            {screens.map((screen, index) => (
              <div key={screen.id}>
                <ScreenLinkRow screen={screen} />
                {index < screens.length - 1 && <div className="border-secondary/30 border-t" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsSection>
  )
}

function ScreenLinkRow({ screen }: { screen: ScreenSummary }) {
  return (
    <Link
      to={`/screens/${screen.id}`}
      className="group flex items-center gap-3 py-2.5 transition-opacity hover:opacity-70"
    >
      <div className="bg-sidebar flex aspect-4/3 h-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {screen.thumbnailUrl ? (
          <img src={screen.thumbnailUrl} alt="" className="size-full object-cover" />
        ) : (
          <MonitorIcon className="text-secondary size-4" />
        )}
      </div>
      <p className="truncate text-sm font-medium" title={screen.name}>
        {screen.name}
      </p>
      <ExternalLinkIcon className="text-secondary ml-auto size-3.5 shrink-0" />
    </Link>
  )
}
