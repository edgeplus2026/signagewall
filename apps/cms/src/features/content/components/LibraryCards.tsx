import { useDraggable } from "@dnd-kit/core"
import {
  ListVideoIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  mediaLibraryDragId,
  playlistLibraryDragId,
} from "@/features/content/lib/contentDnd"
import type { MediaItem } from "@/features/media/types/media.types"
import { PlaylistMediaThumbnail } from "@/features/playlists/components/PlaylistMediaThumbnail"
import { getPlaylistItemCount } from "@/features/playlists/lib/playlistUtils"
import type { PlaylistSummary } from "@/features/playlists/types/playlist.types"
import { cn } from "@/lib/utils"

export function LibraryMediaCardView({
  item,
  className,
  style,
  isDragging = false,
  onAddToContent,
  onEdit,
  dragHandleProps,
}: {
  item: MediaItem
  className?: string
  style?: React.CSSProperties
  isDragging?: boolean
  onAddToContent?: (item: MediaItem) => void
  onEdit?: (item: MediaItem) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}) {
  const { t } = useTranslation()

  return (
    <article
      style={style}
      className={cn(
        "group border-secondary bg-panel relative flex min-w-0 flex-col overflow-hidden rounded-xl border transition-colors",
        isDragging && "opacity-40",
        className,
      )}
    >
      {onAddToContent ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="bg-panel/80 absolute top-1.5 left-1.5 z-10 size-7 opacity-0 group-hover:opacity-100"
          aria-label={t("playlists.manage.sidebar.addToContent")}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
            onAddToContent(item)
          }}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      ) : null}

      {onEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="bg-panel/80 absolute top-1.5 right-1.5 z-10 size-7 opacity-0 group-hover:opacity-100"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <MoreHorizontalIcon className="size-3.5" />
              <span className="sr-only">{t("common.actions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-36">
            <DropdownMenuItem
              onClick={() => {
                onEdit(item)
              }}
            >
              <PencilIcon />
              {t("playlists.manage.sidebar.edit")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <div
        className={cn(
          "flex cursor-grab flex-col active:cursor-grabbing",
          dragHandleProps?.className,
        )}
        style={dragHandleProps?.style}
        {...dragHandleProps}
      >
        <div className="bg-sidebar aspect-4/3 w-full shrink-0 overflow-hidden">
          <PlaylistMediaThumbnail item={item} className="size-full object-cover" />
        </div>

        <div className="min-w-0 shrink-0 p-2">
          <p
            className="line-clamp-2 h-8 overflow-hidden text-xs/4 font-medium break-all"
            title={item.name}
          >
            {item.name}
          </p>
        </div>
      </div>
    </article>
  )
}

export function LibraryMediaCardOverlay({ item }: { item: MediaItem }) {
  return (
    <div className="bg-panel ring-secondary pointer-events-none w-35 rotate-0 overflow-hidden rounded-xl shadow-lg ring-1">
      <LibraryMediaCardView item={item} isDragging={false} />
    </div>
  )
}

/** Compact row overlay shown while dragging a media item in from a list view. */
export function LibraryDragOverlayRow({
  item,
  width,
  height,
}: {
  item: MediaItem
  width?: number
  height?: number
}) {
  return (
    <div
      className="bg-panel ring-secondary flex items-center gap-2 rounded-md px-1.5 py-1.5 shadow-lg ring-1"
      style={width && height ? { width, height } : undefined}
    >
      <div className="bg-sidebar size-8 shrink-0 overflow-hidden rounded-md">
        <PlaylistMediaThumbnail item={item} className="size-full object-cover" />
      </div>
      <p className="text-primary truncate text-xs font-medium">{item.name}</p>
    </div>
  )
}

/** Compact row overlay shown while dragging a playlist in from a list view. */
export function PlaylistLibraryDragOverlayRow({
  playlist,
  width,
  height,
}: {
  playlist: PlaylistSummary
  width?: number
  height?: number
}) {
  return (
    <div
      className="bg-panel ring-secondary flex items-center gap-2 rounded-md px-1.5 py-1.5 shadow-lg ring-1"
      style={width && height ? { width, height } : undefined}
    >
      <div className="bg-sidebar flex size-8 shrink-0 items-center justify-center rounded-md">
        <ListVideoIcon className="text-secondary size-4" />
      </div>
      <p className="text-primary truncate text-xs font-medium">{playlist.name}</p>
    </div>
  )
}

export function LibraryMediaCard({
  item,
  onAddToContent,
  onEdit,
}: {
  item: MediaItem
  onAddToContent: (item: MediaItem) => void
  onEdit: (item: MediaItem) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: mediaLibraryDragId(item.id),
    data: {
      type: "library",
      mediaId: item.id,
      mediaType: item.type,
      defaultDuration: item.defaultDuration,
    },
  })

  return (
    <div ref={setNodeRef} className={cn("min-w-0", isDragging && "opacity-40")}>
      <LibraryMediaCardView
        item={item}
        isDragging={false}
        onAddToContent={onAddToContent}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function LibraryPlaylistCard({
  playlist,
  onAddToContent,
  onUpdatePlaylist,
}: {
  playlist: PlaylistSummary
  onAddToContent: (playlist: PlaylistSummary) => void
  onUpdatePlaylist?: (playlistId: string) => void
}) {
  const { t } = useTranslation()
  const itemCount = getPlaylistItemCount(playlist)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: playlistLibraryDragId(playlist.id),
    data: { type: "library-playlist", playlistId: playlist.id },
  })

  return (
    <div ref={setNodeRef} className={cn("min-w-0", isDragging && "opacity-40")}>
      <article className="group border-secondary bg-panel relative flex min-w-0 flex-col overflow-hidden rounded-xl border transition-colors">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="bg-panel/80 absolute top-1.5 left-1.5 z-10 size-7 opacity-0 group-hover:opacity-100"
          aria-label={t("screens.content.addPlaylistToContent")}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
            onAddToContent(playlist)
          }}
        >
          <PlusIcon className="size-3.5" />
        </Button>

        {onUpdatePlaylist ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="bg-panel/80 absolute top-1.5 right-1.5 z-10 size-7 opacity-0 group-hover:opacity-100"
                onPointerDown={(event) => {
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                <MoreHorizontalIcon className="size-3.5" />
                <span className="sr-only">{t("common.actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-36">
              <DropdownMenuItem
                onClick={() => {
                  onUpdatePlaylist(playlist.id)
                }}
              >
                <PencilIcon />
                {t("playlists.manage.sidebar.edit")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <div
          className="flex cursor-grab flex-col active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <div className="bg-sidebar relative flex aspect-4/3 w-full shrink-0 items-center justify-center overflow-hidden">
            {itemCount === 0 ? (
              <span className="text-secondary px-2 text-center text-[10px] font-medium">
                {t("playlists.emptyPlaylist")}
              </span>
            ) : playlist.thumbnailUrl ? (
              <img src={playlist.thumbnailUrl} alt="" className="size-full object-cover" />
            ) : (
              <ListVideoIcon className="text-secondary size-6" />
            )}
          </div>

          <div className="min-w-0 shrink-0 p-2">
            <p
              className="line-clamp-2 h-8 overflow-hidden text-xs/4 font-medium break-all"
              title={playlist.name}
            >
              {playlist.name}
            </p>
          </div>
        </div>
      </article>
    </div>
  )
}
