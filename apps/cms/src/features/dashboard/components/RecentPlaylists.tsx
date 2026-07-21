import { ChevronRightIcon, ListVideoIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  formatDurationSeconds,
  getPlaylistItemCount,
  getPlaylistTotalDuration,
} from '@/features/playlists/lib/playlistUtils'
import type { PlaylistSummary } from '@/features/playlists/types/playlist.types'

interface RecentPlaylistsProps {
  playlists: PlaylistSummary[]
}

export function RecentPlaylists({ playlists }: RecentPlaylistsProps) {
  const { t } = useTranslation()

  if (playlists.length === 0) {
    return (
      <Empty className="min-h-50 flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListVideoIcon />
          </EmptyMedia>
          <EmptyTitle>{t('dashboard.recentPlaylists.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('dashboard.recentPlaylists.empty')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/playlists">{t('dashboard.recentPlaylists.create')}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col">
      {playlists.map((playlist) => {
        const count = getPlaylistItemCount(playlist)
        const duration = formatDurationSeconds(getPlaylistTotalDuration(playlist))

        return (
          <li key={playlist.id}>
            <Link
              to={`/playlists/${playlist.id}`}
              className="group hover:bg-highlight -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
            >
              <div className="bg-sidebar text-secondary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
                {playlist.thumbnailUrl ? (
                  <img src={playlist.thumbnailUrl} alt="" className="size-full object-cover" />
                ) : (
                  <ListVideoIcon className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-primary truncate text-sm font-medium">{playlist.name}</p>
                <p className="text-secondary truncate text-xs tabular-nums">
                  {t('dashboard.recentPlaylists.meta', { count, duration })}
                </p>
              </div>
              <ChevronRightIcon className="text-secondary/60 group-hover:text-primary size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
