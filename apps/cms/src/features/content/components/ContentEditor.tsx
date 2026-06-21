import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LibraryIcon, ListVideoIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  ContentItemCard,
  ContentItemCardOverlay,
} from '@/features/content/components/ContentItemCard'
import { useContentDrag } from '@/features/content/hooks/useContentDrag'
import { useContentMetadata } from '@/features/content/hooks/useContentMetadata'
import {
  CONTENT_CANVAS_ID,
  CONTENT_REMOVE_ID,
  CONTENT_SECTION_ID,
  PLACEHOLDER_ID,
} from '@/features/content/lib/contentDnd'
import { isDraftDirty, getDraftTotalDuration } from '@/features/content/lib/contentDraft'
import { getContentTypeDefinition } from '@/features/content/registry/contentTypeRegistry'
import type { ContentDraftItem } from '@/features/content/types/contentDraft.types'
import { useMediaItem } from '@/features/media/hooks/useMedia'
import { mediaGridClassName } from '@/features/media/lib/mediaActionCardStyles'
import type { MediaItem } from '@/features/media/types/media.types'
import { usePlaylists } from '@/features/playlists/hooks/usePlaylists'
import { formatDurationSeconds } from '@/features/playlists/lib/playlistUtils'
import { useIsBelowLg } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

export interface ContentEditorLabels {
  libraryTitle: string
  libraryDescription: string
  librarySearch: string
  libraryBack: string
  libraryEmpty: string
  libraryEmptySearch: string
  playlistsTab: string
  playlistsSearch: string
  playlistsEmpty: string
  playlistsEmptySearch: string
  emptyTitle: string
  emptyDescription: string
  hintTitle: string
  hintDescription: string
  totalDuration: string
  itemsLabel: string
  itemCount: string
  saveChanges: string
  removeItem: string
  disableItem: string
  enableItem: string
  disabledBadge: string
  removeDropZone: string
  durationLabel: string
  mediaUnavailable: string
  unknownMedia: string
  unknownPlaylist: string
  playlistType: string
}

interface ContentEditorProps {
  draftItems: ContentDraftItem[]
  baseline: ContentDraftItem[]
  onDraftItemsChange: (items: ContentDraftItem[]) => void
  onSave: () => Promise<void>
  isSaving: boolean
  labels: ContentEditorLabels
  /** The library panel/sidebar; container-specific (see PlaylistManageSidebar). */
  sidebar: ReactNode
  footerActions?: ReactNode
  onContentMediaUpdate?: (media: MediaItem) => void
}

const ContentEmptyDropZone = memo(function ContentEmptyDropZone({
  isOver,
  labels,
}: {
  isOver?: boolean
  labels: Pick<ContentEditorLabels, 'emptyTitle' | 'emptyDescription'>
}) {
  return (
    <div
      className={cn(
        'border-secondary flex min-h-full flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors',
        isOver && 'border-brand bg-brand/5',
      )}
    >
      <ListVideoIcon className="text-secondary size-8" />
      <p className="text-primary text-sm font-medium">{labels.emptyTitle}</p>
      <p className="text-secondary max-w-xs text-xs">{labels.emptyDescription}</p>
    </div>
  )
})

const ContentPlaceholderCell = memo(function ContentPlaceholderCell() {
  const { setNodeRef, transform, transition } = useSortable({ id: PLACEHOLDER_ID })

  return (
    <div
      ref={setNodeRef}
      aria-hidden
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="border-brand bg-brand/5 flex min-w-42 flex-col overflow-hidden rounded-xl border-2 border-dashed"
    >
      <div className="bg-brand/5 aspect-4/3 w-full shrink-0" />
      <div className="flex h-24 shrink-0 flex-col gap-1.5 p-2.5">
        <div className="bg-sidebar/80 h-11 rounded-md" />
        <div className="bg-sidebar/60 h-7 rounded-md" />
      </div>
    </div>
  )
})

const ContentHintCard = memo(function ContentHintCard({
  labels,
}: {
  labels: Pick<ContentEditorLabels, 'hintTitle' | 'hintDescription'>
}) {
  return (
    <div className="border-secondary bg-panel/40 flex min-w-42 flex-col overflow-hidden rounded-xl border border-dashe min-h-56">
      <div className="flex aspect-4/3 w-full flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <PlusIcon className="text-secondary size-8" />
        <p className="text-primary text-sm font-medium">{labels.hintTitle}</p>
        <p className="text-secondary text-xs leading-snug">{labels.hintDescription}</p>
      </div>
    </div>
  )
})

const ContentRemoveZone = memo(function ContentRemoveZone({ label }: { label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: CONTENT_REMOVE_ID })

  return (
    <div
      ref={setNodeRef}
      className="pointer-events-none absolute bottom-0 left-1/2 z-30 -translate-x-1/2"
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-200',
          isOver
            ? 'border-danger bg-danger scale-105 text-white shadow-xl'
            : 'border-danger/30 bg-danger/10 text-danger',
        )}
      >
        <Trash2Icon className={cn('size-4 shrink-0 transition-transform', isOver && 'scale-110')} />
        <span>{label}</span>
      </div>
    </div>
  )
})

export function ContentEditor({
  draftItems,
  baseline,
  onDraftItemsChange,
  onSave,
  isSaving,
  labels,
  sidebar,
  footerActions,
  onContentMediaUpdate,
}: ContentEditorProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isBelowLg = useIsBelowLg()
  const [libraryOpen, setLibraryOpen] = useState(false)
  const isDirty = isDraftDirty(draftItems, baseline)

  const handleUpdatePlaylist = useCallback(
    (playlistId: string) => {
      void navigate(`/playlists/${playlistId}`)
    },
    [navigate],
  )

  useEffect(() => {
    if (!isBelowLg) {
      // Close the mobile library sheet when the viewport grows past the
      // breakpoint — syncing UI state to an external (viewport) source.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLibraryOpen(false)
    }
  }, [isBelowLg])

  const {
    sensors,
    collisionDetection,
    renderItems,
    sortableIds,
    isLibraryDrag,
    activeLibraryDrag,
    activeReorderId,
    dragOverlaySize,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useContentDrag({
    draftItems,
    onItemsChange: onDraftItemsChange,
  })

  // Resolve every draft item's metadata via the content-type registry; each
  // type owns how it fetches (media: per-id, playlist: global query).
  const { resolveMeta } = useContentMetadata(draftItems)

  const { data: activeDragMediaItem } = useMediaItem(
    activeLibraryDrag?.type === 'media' ? activeLibraryDrag.mediaId : null,
  )

  const { data: allPlaylists = [] } = usePlaylists()

  const cardLabels = useMemo(
    () => ({
      removeItem: labels.removeItem,
      disableItem: labels.disableItem,
      enableItem: labels.enableItem,
      disabledBadge: labels.disabledBadge,
      mediaUnavailable: labels.mediaUnavailable,
      unknownMedia: labels.unknownMedia,
      unknownPlaylist: labels.unknownPlaylist,
      durationLabel: labels.durationLabel,
      playlistType: labels.playlistType,
    }),
    [labels],
  )

  const handleDurationChange = useCallback(
    (clientId: string, duration: number) => {
      const clamped = Math.min(3600, Math.max(1, duration))
      onDraftItemsChange(
        draftItems.map((item) =>
          item.clientId === clientId &&
          getContentTypeDefinition(item.type).capabilities.showsDurationInput
            ? { ...item, duration: clamped }
            : item,
        ),
      )
    },
    [draftItems, onDraftItemsChange],
  )

  const handleRemove = useCallback(
    (clientId: string) => {
      onDraftItemsChange(draftItems.filter((item) => item.clientId !== clientId))
    },
    [draftItems, onDraftItemsChange],
  )

  const handleToggleDisabled = useCallback(
    (clientId: string) => {
      onDraftItemsChange(
        draftItems.map((item) =>
          item.clientId === clientId
            ? { ...item, disabled: !item.disabled }
            : item,
        ),
      )
    },
    [draftItems, onDraftItemsChange],
  )

  const { setNodeRef: setCanvasRef, isOver: isCanvasOver } = useDroppable({
    id: CONTENT_CANVAS_ID,
  })

  const activeReorderItem = activeReorderId
    ? (draftItems.find((item) => item.clientId === activeReorderId) ?? null)
    : null

  const activeDragMedia = activeLibraryDrag?.type === 'media' ? (activeDragMediaItem ?? null) : null
  const activeDragPlaylist =
    activeLibraryDrag?.type === 'playlist'
      ? (allPlaylists.find((entry) => entry.id === activeLibraryDrag.playlistId) ?? null)
      : null

  const totalDuration = getDraftTotalDuration(draftItems)
  const itemCount = draftItems.length
  const isEmpty = renderItems.length === 0

  const libraryPanel = sidebar

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >

      {isBelowLg ? (
        <>
          {!libraryOpen ? (
            <Button
              type="button"
              size="icon"
              className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-lg"
              aria-label={labels.libraryTitle}
              onClick={() => {
                setLibraryOpen(true)
              }}
            >
              <LibraryIcon className="size-6" />
            </Button>
          ) : null}

          <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 [&_aside]:min-h-0 [&_aside]:flex-1 [&_aside]:border-0 [&_aside>div]:border-0">
                {libraryPanel}
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        libraryPanel
      )}
        <section id={CONTENT_SECTION_ID} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="visible-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
            <div ref={setCanvasRef} className="flex min-h-full flex-1 flex-col">
              {isEmpty ? (
                <ContentEmptyDropZone isOver={isCanvasOver} labels={labels} />
              ) : (
                <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                  <div className={mediaGridClassName}>
                    {renderItems.map((item) => {
                      if (item.clientId === PLACEHOLDER_ID) {
                        return <ContentPlaceholderCell key={PLACEHOLDER_ID} />
                      }

                      const meta = resolveMeta(item)

                      return (
                        <ContentItemCard
                          key={item.clientId}
                          item={item}
                          meta={meta}
                          onDurationChange={handleDurationChange}
                          onRemove={handleRemove}
                          onToggleDisabled={handleToggleDisabled}
                          onUpdatePlaylist={handleUpdatePlaylist}
                          {...(meta && onContentMediaUpdate
                            ? { onUpdate: onContentMediaUpdate }
                            : {})}
                          labels={cardLabels}
                        />
                      )
                    })}
                    {!isLibraryDrag ? <ContentHintCard labels={labels} /> : null}
                  </div>
                </SortableContext>
              )}
            </div>
          </div>

          <div className="border-secondary flex shrink-0 flex-col gap-3 border-t pt-3 max-lg:pr-16 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-secondary">
                {labels.totalDuration}:{' '}
                <span className="text-primary font-medium">
                  {formatDurationSeconds(totalDuration)}
                </span>
              </span>
              <span className="text-secondary">
                {labels.itemsLabel}:{' '}
                <span className="text-primary font-medium">
                  {t(labels.itemCount, { count: itemCount })}
                </span>
              </span>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                disabled={!isDirty || isSaving}
                onClick={() => {
                  void onSave()
                }}
              >
                {labels.saveChanges}
              </Button>
              {footerActions}
            </div>
          </div>

          {activeReorderItem ? <ContentRemoveZone label={labels.removeDropZone} /> : null}
        </section>

        <DragOverlay dropAnimation={null}>
          {activeReorderItem ? (
            <ContentItemCardOverlay
              item={activeReorderItem}
              meta={resolveMeta(activeReorderItem)}
              labels={cardLabels}
              {...(dragOverlaySize ?? {})}
            />
          ) : activeDragMedia ? (
            getContentTypeDefinition('media').card.LibraryDragOverlay({
              meta: activeDragMedia,
              isCustomSidebar: Boolean(sidebar),
              ...(dragOverlaySize ?? {}),
            })
          ) : activeDragPlaylist ? (
            getContentTypeDefinition('playlist').card.LibraryDragOverlay({
              meta: activeDragPlaylist,
              isCustomSidebar: Boolean(sidebar),
              ...(dragOverlaySize ?? {}),
            })
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
