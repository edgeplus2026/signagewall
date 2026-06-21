import {
  ArrowDownAZIcon,
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  ImageIcon,
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
  UploadCloudIcon,
} from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'

import { useViewMode } from '@/hooks/useViewMode'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BulkActionsBar } from '@/features/media/components/BulkActionsBar'
import { CreateFolderSheet } from '@/features/media/components/CreateFolderSheet'
import { DeleteMediaDialog } from '@/features/media/components/DeleteMediaDialog'
import { MediaBreadcrumb } from '@/features/media/components/MediaBreadcrumb'
import { MediaDetailSheet } from '@/features/media/components/MediaDetailSheet'
import { MediaFoldersSection } from '@/features/media/components/MediaFoldersSection'
import { MediaGrid } from '@/features/media/components/MediaGrid'
import { MediaTable } from '@/features/media/components/MediaTable'
import { MoveMediaSheet } from '@/features/media/components/MoveMediaSheet'
import { RenameFolderSheet } from '@/features/media/components/RenameFolderSheet'
import { RenameMediaSheet } from '@/features/media/components/RenameMediaSheet'
import {
  useFolderPath,
  useFolders,
  useMediaFiles,
  useMoveMedia,
} from '@/features/media/hooks/useMedia'
import { filterMediaItems } from '@/features/media/lib/filterMediaItems'
import { mediaGridClassName } from '@/features/media/lib/mediaActionCardStyles'
import { validateMediaFiles } from '@/features/media/lib/validateMediaFiles'
import { UploadMediaSheet } from '@/features/media/stock/components/UploadMediaSheet'
import { useUploadStore } from '@/features/media/store/uploadStore'
import type {
  MediaItem,
  MediaSortDirection,
  MediaSortField,
  MediaTypeFilter,
} from '@/features/media/types/media.types'
import { AddToPlaylistSheet } from '@/features/playlists/components/AddToPlaylistSheet'
import { AddToScreenSheet } from '@/features/screens/components/AddToScreenSheet'

function MediaGridSkeleton() {
  return (
    <div className={mediaGridClassName}>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}

function MediaTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-secondary">
      <Skeleton className="h-10 rounded-none" />
      <Skeleton className="h-14 rounded-none" />
      <Skeleton className="h-14 rounded-none" />
      <Skeleton className="h-14 rounded-none" />
      <Skeleton className="h-14 rounded-none" />
    </div>
  )
}

export interface MediaBrowserHandle {
  openCreateFolder: () => void
  openUpload: () => void
  uploadFiles: (files: File[]) => void
}

interface MediaBrowserProps {
  onItemCountChange?: (count: number) => void
}

export const MediaBrowser = forwardRef<MediaBrowserHandle, MediaBrowserProps>(function MediaBrowser(
  { onItemCountChange },
  ref,
) {
  const { t } = useTranslation()
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>('all')
  const [sortBy, setSortBy] = useState<MediaSortField>('name')
  const [sortDirection, setSortDirection] = useState<MediaSortDirection>('asc')
  const [viewMode, setViewMode] = useViewMode('media')
  const [foldersCollapsed, setFoldersCollapsed] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [deleteIds, setDeleteIds] = useState<string[]>([])
  const [moveIds, setMoveIds] = useState<string[]>([])
  const [addToPlaylistIds, setAddToPlaylistIds] = useState<string[]>([])
  const [addToScreenIds, setAddToScreenIds] = useState<string[]>([])
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null)
  const [renameFolder, setRenameFolder] = useState<MediaItem | null>(null)
  const [renameMedia, setRenameMedia] = useState<MediaItem | null>(null)

  const moveMedia = useMoveMedia()
  const enqueueFiles = useUploadStore((state) => state.enqueueFiles)

  const { data: folders = [], isPending: foldersPending, isFetching: foldersFetching } =
    useFolders(currentFolderId)

  const { data: rawMediaItems = [], isPending: mediaPending, isFetching: mediaFetching } =
    useMediaFiles(currentFolderId)

  const mediaItems = useMemo(
    () =>
      filterMediaItems(rawMediaItems, {
        search,
        typeFilter,
        sortBy,
        sortDirection,
      }),
    [rawMediaItems, search, typeFilter, sortBy, sortDirection],
  )

  useEffect(() => {
    onItemCountChange?.(rawMediaItems.length)
  }, [onItemCountChange, rawMediaItems.length])

  const showFoldersSkeleton =
    foldersPending || (foldersFetching && folders.length === 0)

  const showMediaSkeleton =
    mediaPending || (mediaFetching && rawMediaItems.length === 0)

  const hasActiveFilters = search.trim().length > 0 || typeFilter !== 'all'

  const { data: folderPath = [] } = useFolderPath(currentFolderId)

  const parentFolderId =
    folderPath.length > 1 ? folderPath[folderPath.length - 2]?.id ?? null : null

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleNavigate = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId)
      clearSelection()
    },
    [clearSelection],
  )

  const handleNavigateBack = useCallback(() => {
    handleNavigate(parentFolderId)
  }, [handleNavigate, parentFolderId])

  const handleUpload = useCallback(
    (files: File[]) => {
      const { validFiles, errors } = validateMediaFiles(files, t)

      errors.forEach((message) => {
        toast.error(message)
      })

      if (validFiles.length === 0) {
        return
      }

      enqueueFiles(validFiles, currentFolderId)
      toast.success(t('media.upload.queued', { count: validFiles.length }))
    },
    [currentFolderId, enqueueFiles, t],
  )

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
        setSelectedIds(new Set(mediaItems.map((item) => item.id)))
      } else {
        clearSelection()
      }
    },
    [clearSelection, mediaItems],
  )

  const handleDropOnFolder = useCallback(
    async (itemIds: string[], folderId: string) => {
      try {
        await moveMedia.mutateAsync({ ids: itemIds, targetFolderId: folderId })
        toast.success(t('media.move.success'))
        clearSelection()
      } catch {
        toast.error(t('media.move.error'))
      }
    },
    [clearSelection, moveMedia, t],
  )

  useImperativeHandle(
    ref,
    () => ({
      openCreateFolder: () => {
        setCreateFolderOpen(true)
      },
      openUpload: () => {
        setUploadSheetOpen(true)
      },
      uploadFiles: handleUpload,
    }),
    [handleUpload],
  )

  return (
    <>
      <div className="flex flex-col gap-7">
        <MediaBreadcrumb path={folderPath} onNavigate={handleNavigate} />

        <section className="flex flex-col gap-7">
          <MediaFoldersSection
            folders={folders}
            isLoading={showFoldersSkeleton}
            collapsed={foldersCollapsed}
            onCollapsedChange={setFoldersCollapsed}
            showBack={currentFolderId !== null}
            onNavigateBack={handleNavigateBack}
            onCreateFolder={() => {
              setCreateFolderOpen(true)
            }}
            onOpenFolder={handleNavigate}
            onRename={(folder) => {
              setRenameFolder(folder)
            }}
            onMove={(ids) => {
              setMoveIds(ids)
            }}
            onDelete={(ids) => {
              setDeleteIds(ids)
            }}
            onDropOnFolder={(ids, folderId) => {
              void handleDropOnFolder(ids, folderId)
            }}
          />

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full min-w-0 sm:max-w-xs">
              <SearchIcon className="text-secondary pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                }}
                placeholder={t('media.search')}
                className="h-8 w-full pl-8"
              />
            </div>

            <TooltipProvider delayDuration={300}>
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value as MediaTypeFilter)
                  }}
                >
                  <SelectTrigger size="default" className="h-8 w-28">
                    <SelectValue placeholder={t('media.filter.label')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('media.filter.all')}</SelectItem>
                    <SelectItem value="image">{t('media.filter.image')}</SelectItem>
                    <SelectItem value="video">{t('media.filter.video')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(value as MediaSortField)
                  }}
                >
                  <SelectTrigger size="default" className="h-8 w-28">
                    <ArrowDownAZIcon className="text-secondary size-3.5" />
                    <SelectValue placeholder={t('media.sort.label')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t('media.sort.name')}</SelectItem>
                    <SelectItem value="createdAt">{t('media.sort.createdAt')}</SelectItem>
                    <SelectItem value="type">{t('media.sort.type')}</SelectItem>
                    <SelectItem value="size">{t('media.sort.size')}</SelectItem>
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
                        sortDirection === 'asc'
                          ? t('media.sort.asc')
                          : t('media.sort.desc')
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
                    {sortDirection === 'asc' ? t('media.sort.asc') : t('media.sort.desc')}
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
                        aria-label={t('media.view.grid')}
                        aria-pressed={viewMode === 'grid'}
                        onClick={() => {
                          setViewMode('grid')
                        }}
                      >
                        <LayoutGridIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('media.view.grid')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon-sm"
                        className="size-7 shrink-0"
                        aria-label={t('media.view.list')}
                        aria-pressed={viewMode === 'list'}
                        onClick={() => {
                          setViewMode('list')
                        }}
                      >
                        <ListIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('media.view.list')}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          </div>

          <BulkActionsBar
            selectedCount={selectedIds.size}
            onMove={() => {
              setMoveIds(Array.from(selectedIds))
            }}
            onAddToPlaylist={() => {
              setAddToPlaylistIds(Array.from(selectedIds))
            }}
            onAddToScreen={() => {
              setAddToScreenIds(Array.from(selectedIds))
            }}
            onDelete={() => {
              setDeleteIds(Array.from(selectedIds))
            }}
            onClear={clearSelection}
          />

          {showMediaSkeleton ? (
            viewMode === 'grid' ? <MediaGridSkeleton /> : <MediaTableSkeleton />
          ) : mediaItems.length === 0 ? (
            <Empty className="min-h-48 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ImageIcon aria-hidden />
                </EmptyMedia>
                <EmptyTitle>
                  {hasActiveFilters ? t('media.emptySearch') : t('media.empty')}
                </EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? t('media.emptySearchDescription')
                    : t('media.emptyDescription')}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setTypeFilter('all')
                    }}
                  >
                    {t('media.emptyClearFilters')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadSheetOpen(true)
                    }}
                  >
                    <UploadCloudIcon data-icon="inline-start" />
                    {t('media.dropzone.upload.title')}
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : viewMode === 'grid' ? (
            <MediaGrid
              items={mediaItems}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onUpload={() => {
                setUploadSheetOpen(true)
              }}
              onOpenItem={(item) => {
                setDetailItem(item)
              }}
              onRename={(item) => {
                setRenameMedia(item)
              }}
              onMove={(ids) => {
                setMoveIds(ids)
              }}
              onAddToPlaylist={(ids) => {
                setAddToPlaylistIds(ids)
              }}
              onAddToScreen={(ids) => {
                setAddToScreenIds(ids)
              }}
              onDelete={(ids) => {
                setDeleteIds(ids)
              }}
            />
          ) : (
            <MediaTable
              items={mediaItems}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onOpenItem={(item) => {
                setDetailItem(item)
              }}
              onRename={(item) => {
                setRenameMedia(item)
              }}
              onMove={(ids) => {
                setMoveIds(ids)
              }}
              onAddToPlaylist={(ids) => {
                setAddToPlaylistIds(ids)
              }}
              onAddToScreen={(ids) => {
                setAddToScreenIds(ids)
              }}
              onDelete={(ids) => {
                setDeleteIds(ids)
              }}
            />
          )}
        </section>

        <MediaDetailSheet
          open={!!detailItem}
          onOpenChange={(open) => {
            if (!open) setDetailItem(null)
          }}
          item={detailItem}
          onAddToPlaylist={() => {
            if (detailItem) setAddToPlaylistIds([detailItem.id])
          }}
          onAddToScreen={() => {
            if (detailItem) setAddToScreenIds([detailItem.id])
          }}
        />

        <UploadMediaSheet
          open={uploadSheetOpen}
          onOpenChange={setUploadSheetOpen}
          parentId={currentFolderId}
          onUploadFiles={handleUpload}
          onAddToPlaylist={(mediaId) => {
            setUploadSheetOpen(false)
            setAddToPlaylistIds([mediaId])
          }}
          onAddToScreen={(mediaId) => {
            setUploadSheetOpen(false)
            setAddToScreenIds([mediaId])
          }}
        />

        <CreateFolderSheet
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          parentId={currentFolderId}
        />

        <RenameFolderSheet
          open={!!renameFolder}
          onOpenChange={(open) => {
            if (!open) setRenameFolder(null)
          }}
          folder={renameFolder}
        />

        <RenameMediaSheet
          open={!!renameMedia}
          onOpenChange={(open) => {
            if (!open) setRenameMedia(null)
          }}
          item={renameMedia}
        />

        <DeleteMediaDialog
          open={deleteIds.length > 0}
          onOpenChange={(open) => {
            if (!open) setDeleteIds([])
          }}
          itemIds={deleteIds}
          onSuccess={clearSelection}
        />

        <MoveMediaSheet
          open={moveIds.length > 0}
          onOpenChange={(open) => {
            if (!open) setMoveIds([])
          }}
          itemIds={moveIds}
          currentFolderId={currentFolderId}
          onSuccess={clearSelection}
        />

        <AddToPlaylistSheet
          open={addToPlaylistIds.length > 0}
          onOpenChange={(open) => {
            if (!open) setAddToPlaylistIds([])
          }}
          mediaIds={addToPlaylistIds}
          onSuccess={clearSelection}
        />

        <AddToScreenSheet
          open={addToScreenIds.length > 0}
          onOpenChange={(open) => {
            if (!open) setAddToScreenIds([])
          }}
          mode="media"
          mediaIds={addToScreenIds}
          onSuccess={clearSelection}
        />
      </div>
    </>
  )
})
