import {
  ArrowDownAZIcon,
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  LayoutGridIcon,
  ListIcon,
  ListVideoIcon,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  QueryErrorBanner,
  QueryErrorState,
} from '@/components/common/QueryErrorState'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ContentPreviewDialog } from '@/features/content/components/ContentPreviewDialog'
import { mediaGridClassName } from '@/features/media/lib/mediaActionCardStyles'
import { useCanEditOrgContent } from '@/features/organizations/hooks/useIsOrgAdmin'
import { DeletePlaylistDialog } from '@/features/playlists/components/DeletePlaylistDialog'
import { PlaylistsBulkActionsBar } from '@/features/playlists/components/PlaylistsBulkActionsBar'
import { PlaylistsGrid } from '@/features/playlists/components/PlaylistsGrid'
import { PlaylistsTable } from '@/features/playlists/components/PlaylistsTable'
import { useDuplicatePlaylist } from '@/features/playlists/hooks/usePlaylists'
import { getPlaylistItemCount } from '@/features/playlists/lib/playlistUtils'
import type {
  PlaylistDetailTab,
  PlaylistSortDirection,
  PlaylistSortField,
  PlaylistSummary,
} from '@/features/playlists/types/playlist.types'
import { AddToScreenSheet } from '@/features/screens/components/AddToScreenSheet'
import { useViewMode } from '@/hooks/useViewMode'
import { getApiErrorMessage } from '@/lib/api-error'

function PlaylistsGridSkeleton() {
  return (
    <div className={mediaGridClassName}>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

function PlaylistsTableSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />
}

interface PlaylistsBrowserProps {
  playlists: PlaylistSummary[]
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
  onCreateClick: () => void
}

export function PlaylistsBrowser({
  playlists,
  isLoading,
  isError,
  onRetry,
  onCreateClick,
}: PlaylistsBrowserProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const duplicatePlaylist = useDuplicatePlaylist()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<PlaylistSortField>('name')
  const [sortDirection, setSortDirection] = useState<PlaylistSortDirection>('asc')
  const [viewMode, setViewMode] = useViewMode('playlists')
  // Server-enforced; hiding the buttons just stops a viewer walking into a 403.
  const canEdit = useCanEditOrgContent()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteIds, setDeleteIds] = useState<string[]>([])
  const [addToScreenIds, setAddToScreenIds] = useState<string[]>([])
  const [previewPlaylist, setPreviewPlaylist] = useState<PlaylistSummary | null>(null)

  const filteredPlaylists = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matched = query
      ? playlists.filter((playlist) => playlist.name.toLowerCase().includes(query))
      : playlists

    const direction = sortDirection === 'asc' ? 1 : -1
    return [...matched].sort((a, b) => {
      const comparison =
        sortBy === 'name' ? a.name.localeCompare(b.name) : a.createdAt.localeCompare(b.createdAt)
      return comparison * direction
    })
  }, [playlists, search, sortBy, sortDirection])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedIds(new Set(filteredPlaylists.map((playlist) => playlist.id)))
      } else {
        clearSelection()
      }
    },
    [clearSelection, filteredPlaylists],
  )

  const openPlaylist = useCallback(
    (playlist: PlaylistSummary, tab: PlaylistDetailTab = 'content') => {
      const path =
        tab === 'settings' ? `/playlists/${playlist.id}?tab=settings` : `/playlists/${playlist.id}`
      void navigate(path)
    },
    [navigate],
  )

  const handleDuplicate = useCallback(
    async (playlist: PlaylistSummary) => {
      try {
        await duplicatePlaylist.mutateAsync({
          id: playlist.id,
          copySuffix: t('playlists.duplicate.copySuffix'),
        })
        toast.success(t('playlists.duplicate.success'))
      } catch (error) {
        toast.error(getApiErrorMessage(error, t('playlists.duplicate.error')))
      }
    },
    [duplicatePlaylist, t],
  )

  const hasActiveSearch = search.trim().length > 0

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder={t('playlists.search')}
            className="h-8 w-full sm:max-w-xs"
          />

          <TooltipProvider delayDuration={300}>
            <div className="flex min-w-0 flex-wrap items-center gap-2 self-end sm:shrink-0 sm:justify-end sm:self-auto">
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as PlaylistSortField)
                }}
              >
                <SelectTrigger size="default" className="h-8 w-28">
                  <ArrowDownAZIcon className="text-secondary size-3.5" />
                  <SelectValue placeholder={t('playlists.sort.label')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('playlists.sort.name')}</SelectItem>
                  <SelectItem value="createdAt">{t('playlists.sort.createdAt')}</SelectItem>
                </SelectContent>
              </Select>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-8 shrink-0"
                    aria-label={
                      sortDirection === 'asc' ? t('playlists.sort.asc') : t('playlists.sort.desc')
                    }
                    onClick={() => {
                      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
                    }}
                  >
                    {sortDirection === 'asc' ? (
                      <ArrowUpNarrowWideIcon />
                    ) : (
                      <ArrowDownWideNarrowIcon />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sortDirection === 'asc' ? t('playlists.sort.asc') : t('playlists.sort.desc')}
                </TooltipContent>
              </Tooltip>

              <div
                aria-hidden
                className="bg-quaternary hidden h-8 w-px shrink-0 self-center sm:block"
              />

              <div className="border-secondary flex h-8 shrink-0 items-center rounded-lg border p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon-sm"
                      className="size-7 shrink-0"
                      aria-label={t('playlists.view.grid')}
                      aria-pressed={viewMode === 'grid'}
                      onClick={() => {
                        setViewMode('grid')
                      }}
                    >
                      <LayoutGridIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('playlists.view.grid')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon-sm"
                      className="size-7 shrink-0"
                      aria-label={t('playlists.view.list')}
                      aria-pressed={viewMode === 'list'}
                      onClick={() => {
                        setViewMode('list')
                      }}
                    >
                      <ListIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('playlists.view.list')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>

        {canEdit && (
        <PlaylistsBulkActionsBar
          selectedCount={selectedIds.size}
          onAddToScreen={() => {
            setAddToScreenIds(Array.from(selectedIds))
          }}
          onDelete={() => {
            setDeleteIds(Array.from(selectedIds))
          }}
          onClear={clearSelection}
        />
        )}

        {isError && playlists.length > 0 && (
          <QueryErrorBanner onRetry={onRetry} />
        )}

        {isLoading ? (
          viewMode === 'grid' ? (
            <PlaylistsGridSkeleton />
          ) : (
            <PlaylistsTableSkeleton />
          )
        ) : isError && playlists.length === 0 ? (
          <QueryErrorState onRetry={onRetry} />
        ) : filteredPlaylists.length === 0 ? (
          <Empty className="min-h-48 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListVideoIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>
                {hasActiveSearch ? t('playlists.emptySearch') : t('playlists.empty')}
              </EmptyTitle>
              <EmptyDescription>
                {hasActiveSearch
                  ? t('playlists.emptySearchDescription')
                  : t('playlists.emptyDescription')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {hasActiveSearch ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                  }}
                >
                  {t('playlists.emptyClearSearch')}
                </Button>
              ) : canEdit ? (
                <Button type="button" variant="outline" size="sm" onClick={onCreateClick}>
                  <ListVideoIcon data-icon="inline-start" />
                  {t('playlists.create.button')}
                </Button>
              ) : null}
            </EmptyContent>
          </Empty>
        ) : viewMode === 'grid' ? (
          <PlaylistsGrid
            playlists={filteredPlaylists}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onOpen={openPlaylist}
            onPreview={setPreviewPlaylist}
            onDuplicate={handleDuplicate}
            onAddToScreen={setAddToScreenIds}
            onDelete={setDeleteIds}
            onCreate={onCreateClick}
          />
        ) : (
          <PlaylistsTable
            playlists={filteredPlaylists}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onOpen={openPlaylist}
            onPreview={setPreviewPlaylist}
            onDuplicate={handleDuplicate}
            onAddToScreen={setAddToScreenIds}
            onDelete={setDeleteIds}
          />
        )}
      </div>

      <DeletePlaylistDialog
        open={deleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setDeleteIds([])
        }}
        playlistIds={deleteIds}
        onSuccess={clearSelection}
      />

      <AddToScreenSheet
        open={addToScreenIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setAddToScreenIds([])
        }}
        mode="playlists"
        playlistIds={addToScreenIds}
        onSuccess={clearSelection}
      />

      <ContentPreviewDialog
        open={previewPlaylist !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewPlaylist(null)
        }}
        target={
          previewPlaylist ? { kind: 'playlist', playlistId: previewPlaylist.id } : null
        }
        {...(previewPlaylist
          ? {
              name: previewPlaylist.name,
              itemCount: getPlaylistItemCount(previewPlaylist),
            }
          : {})}
      />
    </>
  )
}
