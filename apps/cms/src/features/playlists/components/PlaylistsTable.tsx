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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatDurationSeconds,
  getPlaylistItemCount,
  getPlaylistTotalDuration,
} from '@/features/playlists/lib/playlistUtils'
import type { PlaylistSummary, PlaylistDetailTab } from '@/features/playlists/types/playlist.types'

interface PlaylistsTableProps {
  playlists: PlaylistSummary[]
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onOpen: (playlist: PlaylistSummary, tab: PlaylistDetailTab) => void
  onDuplicate: (playlist: PlaylistSummary) => Promise<void>
  onAddToScreen: (ids: string[]) => void
  onDelete: (ids: string[]) => void
}

export function PlaylistsTable({
  playlists,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpen,
  onDuplicate,
  onAddToScreen,
  onDelete,
}: PlaylistsTableProps) {
  const { t, i18n } = useTranslation()
  const allSelected =
    playlists.length > 0 && playlists.every((playlist) => selectedIds.has(playlist.id))
  const someSelected = playlists.some((playlist) => selectedIds.has(playlist.id))

  return (
    <div className="border-secondary min-w-0 overflow-x-auto rounded-xl border">
      <Table containerClassName="overflow-visible" className="min-w-42rem w-full table-fixed">
        <colgroup>
          <col style={{ width: '50px' }} />
          <col style={{ width: '40%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '50px' }} />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={(checked) => {
                  onSelectAll(checked === true)
                }}
                aria-label={t('playlists.selectAll')}
              />
            </TableHead>
            <TableHead>{t('playlists.columns.name')}</TableHead>
            <TableHead>{t('playlists.columns.items')}</TableHead>
            <TableHead>{t('playlists.columns.duration')}</TableHead>
            <TableHead>{t('playlists.columns.updatedAt')}</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">{t('common.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {playlists.map((playlist) => {
            const isSelected = selectedIds.has(playlist.id)
            const itemCount = getPlaylistItemCount(playlist)
            const totalDurationSeconds = getPlaylistTotalDuration(playlist)
            const duration = formatDurationSeconds(totalDurationSeconds)

            return (
              <TableRow
                key={playlist.id}
                data-state={isSelected ? 'selected' : undefined}
                className="cursor-pointer"
                onClick={() => {
                  onOpen(playlist, 'content')
                }}
              >
                <TableCell
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
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="border-secondary bg-sidebar flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                      {playlist.thumbnailUrl ? (
                        <img
                          src={playlist.thumbnailUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ListVideoIcon className="text-secondary size-5" />
                      )}
                    </div>
                    <span className="min-w-0 truncate font-medium" title={playlist.name}>
                      {playlist.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-secondary">
                  {itemCount === 0
                    ? t('playlists.emptyPlaylist')
                    : t('playlists.content.itemCount', { count: itemCount })}
                </TableCell>
                <TableCell className="text-secondary">
                  {totalDurationSeconds > 0 ? duration : '—'}
                </TableCell>
                <TableCell className="text-secondary">
                  {new Date(playlist.updatedAt).toLocaleDateString(i18n.language, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </TableCell>
                <TableCell
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm">
                        <MoreHorizontalIcon />
                        <span className="sr-only">{t('common.actions')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto min-w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          onOpen(playlist, 'content')
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
                      <DropdownMenuItem
                        onClick={() => {
                          onAddToScreen([playlist.id])
                        }}
                      >
                        <MonitorIcon />
                        {t('playlists.actions.addToScreen')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="danger"
                        onClick={() => {
                          onDelete([playlist.id])
                        }}
                      >
                        <Trash2Icon />
                        {t('playlists.actions.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
