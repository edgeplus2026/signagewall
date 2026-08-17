import {
  CopyIcon,
  EyeIcon,
  ListVideoIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  formatDurationSeconds,
  getPlaylistItemCount,
  getPlaylistTotalDuration,
} from '@/features/playlists/lib/playlistUtils'
import type { PlaylistSummary, PlaylistDetailTab } from '@/features/playlists/types/playlist.types'
import { cn } from '@/lib/utils'

interface PlaylistCardProps {
  playlist: PlaylistSummary
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onOpen: (playlist: PlaylistSummary, tab: PlaylistDetailTab) => void
  onPreview: (playlist: PlaylistSummary) => void
  onDuplicate: (playlist: PlaylistSummary) => Promise<void>
  onAddToScreen?: (id: string) => void
  onDelete: (id: string) => void
}

export function PlaylistCard({
  playlist,
  isSelected,
  onSelect,
  onOpen,
  onPreview,
  onDuplicate,
  onAddToScreen,
  onDelete,
}: PlaylistCardProps) {
  const { t } = useTranslation()
  const itemCount = getPlaylistItemCount(playlist)
  const totalDurationSeconds = getPlaylistTotalDuration(playlist)
  const duration = formatDurationSeconds(totalDurationSeconds)

  return (
    <article
      className={cn(
        'group bg-panel relative flex h-full min-w-[11rem] flex-col overflow-hidden rounded-xl border transition-colors',
        isSelected ? 'border-success' : 'border-secondary',
      )}
    >
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => {
            onSelect(playlist.id, checked === true)
          }}
          aria-label={t('playlists.selectItem', { name: playlist.name })}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="bg-panel absolute top-2 right-2 z-10 max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">{t('common.actions')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem
            onClick={() => {
              onPreview(playlist)
            }}
          >
            <EyeIcon />
            {t('playlists.actions.preview')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onOpen(playlist, 'settings')
            }}
          >
            <PencilIcon />
            {t('playlists.actions.update')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void onDuplicate(playlist)
            }}
          >
            <CopyIcon />
            {t('playlists.actions.duplicatePlaylist')}
          </DropdownMenuItem>
          {onAddToScreen ? (
            <DropdownMenuItem
              onClick={() => {
                onAddToScreen(playlist.id)
              }}
            >
              <MonitorIcon />
              {t('playlists.actions.addToScreen')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="danger"
            onClick={() => {
              onDelete(playlist.id)
            }}
          >
            <Trash2Icon />
            {t('playlists.actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        className="flex min-h-0 flex-1 cursor-pointer flex-col text-left"
        onClick={() => {
          onOpen(playlist, 'content')
        }}
      >
        <div className="bg-sidebar relative flex aspect-4/3 w-full shrink-0 items-center justify-center overflow-hidden">
          {itemCount === 0 ? (
            <span className="text-secondary px-3 text-center text-xs font-medium">
              {t('playlists.emptyPlaylist')}
            </span>
          ) : playlist.thumbnailUrl ? (
            <img src={playlist.thumbnailUrl} alt="" className="size-full object-cover" />
          ) : (
            <ListVideoIcon className="text-secondary size-10" />
          )}
        </div>

        <div className="flex h-[5.5rem] shrink-0 flex-col gap-1.5 p-2.5">
          <p
            className="line-clamp-2 h-10 overflow-hidden text-sm/5 font-medium break-words"
            title={playlist.name}
          >
            {playlist.name}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-secondary text-xs">
              {itemCount === 0
                ? t('playlists.emptyPlaylist')
                : t('playlists.content.itemCount', { count: itemCount })}
            </span>
            {totalDurationSeconds > 0 ? (
              <span className="bg-sidebar text-primary inline-flex w-fit shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium">
                {duration}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </article>
  )
}
