import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { mediaGridClassName } from '@/features/media/lib/mediaActionCardStyles'
import { PlaylistCard } from '@/features/playlists/components/PlaylistCard'
import type { PlaylistSummary, PlaylistDetailTab } from '@/features/playlists/types/playlist.types'

interface PlaylistsGridProps {
  playlists: PlaylistSummary[]
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onOpen: (playlist: PlaylistSummary, tab: PlaylistDetailTab) => void
  onDuplicate: (playlist: PlaylistSummary) => Promise<void>
  onAddToScreen: (ids: string[]) => void
  onDelete: (ids: string[]) => void
}

export function PlaylistsGrid({
  playlists,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpen,
  onDuplicate,
  onAddToScreen,
  onDelete,
}: PlaylistsGridProps) {
  const { t } = useTranslation()
  const allSelected =
    playlists.length > 0 && playlists.every((playlist) => selectedIds.has(playlist.id))
  const someSelected = playlists.some((playlist) => selectedIds.has(playlist.id))

  return (
    <div className="flex flex-col gap-4">
      {playlists.length > 0 ? (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            onCheckedChange={(checked) => {
              onSelectAll(checked === true)
            }}
            aria-label={t('playlists.selectAll')}
          />
          <span className="text-secondary text-xs">{t('playlists.selectAll')}</span>
        </div>
      ) : null}

      <div className={mediaGridClassName}>
        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            isSelected={selectedIds.has(playlist.id)}
            onSelect={onSelect}
            onOpen={onOpen}
            onDuplicate={onDuplicate}
            onAddToScreen={(id) => {
              onAddToScreen([id])
            }}
            onDelete={(id) => {
              onDelete([id])
            }}
          />
        ))}
      </div>
    </div>
  )
}
