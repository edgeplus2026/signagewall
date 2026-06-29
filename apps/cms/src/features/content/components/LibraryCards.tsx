import { useDraggable } from "@dnd-kit/core"
import {
  ListVideoIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppIcon } from "@/features/apps/components/AppIcon"
import type { AppInstance, EdgeApp } from "@/features/apps/types/app.types"
import {
  appLibraryDragId,
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

/** Compact row overlay shown while dragging an app instance in from a list view. */
export function AppLibraryDragOverlayRow({
  instance,
  app,
  width,
  height,
}: {
  instance: AppInstance
  app: EdgeApp | undefined
  width?: number
  height?: number
}) {
  return (
    <div
      className="bg-panel ring-secondary flex items-center gap-2 rounded-md px-1.5 py-1.5 shadow-lg ring-1"
      style={width && height ? { width, height } : undefined}
    >
      <AppIcon
        iconSvg={app?.iconSvg}
        color={app?.color}
        className="size-8 shrink-0 rounded-md"
      />
      <p className="text-primary truncate text-xs font-medium">{instance.name}</p>
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

export function LibraryPlaylistCardView({
  playlist,
  isDragging = false,
  onAddToContent,
  onUpdatePlaylist,
  dragHandleProps,
}: {
  playlist: PlaylistSummary
  isDragging?: boolean
  onAddToContent?: (playlist: PlaylistSummary) => void
  onUpdatePlaylist?: (playlistId: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}) {
  const { t } = useTranslation()
  const itemCount = getPlaylistItemCount(playlist)

  return (
    <article
      className={cn(
        "group border-secondary bg-panel relative flex min-w-0 flex-col overflow-hidden rounded-xl border transition-colors",
        isDragging && "opacity-40",
      )}
    >
      {onAddToContent ? (
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
      ) : null}

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
        className={cn(
          "flex cursor-grab flex-col active:cursor-grabbing",
          dragHandleProps?.className,
        )}
        style={dragHandleProps?.style}
        {...dragHandleProps}
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
  )
}

export function LibraryPlaylistCardOverlay({ playlist }: { playlist: PlaylistSummary }) {
  return (
    <div className="bg-panel ring-secondary pointer-events-none w-35 rotate-0 overflow-hidden rounded-xl shadow-lg ring-1">
      <LibraryPlaylistCardView playlist={playlist} />
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: playlistLibraryDragId(playlist.id),
    data: { type: "library-playlist", playlistId: playlist.id },
  })

  return (
    <div ref={setNodeRef} className={cn("min-w-0", isDragging && "opacity-40")}>
      <LibraryPlaylistCardView
        playlist={playlist}
        onAddToContent={onAddToContent}
        {...(onUpdatePlaylist ? { onUpdatePlaylist } : {})}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function LibraryAppCardView({
  instance,
  app,
  isDragging = false,
  onAddToContent,
  onUpdateApp,
  dragHandleProps,
}: {
  instance: AppInstance
  app: EdgeApp | undefined
  isDragging?: boolean
  onAddToContent?: (appInstanceId: string) => void
  onUpdateApp?: (() => void) | undefined
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}) {
  const { t } = useTranslation()

  return (
    <article
      className={cn(
        "group border-secondary bg-panel relative flex min-w-0 flex-col overflow-hidden rounded-xl border transition-colors",
        isDragging && "opacity-40",
      )}
    >
      {onAddToContent ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="bg-panel/80 absolute top-1.5 left-1.5 z-10 size-7 opacity-0 group-hover:opacity-100"
          aria-label={t("screens.content.addApp.add")}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
            onAddToContent(instance.id)
          }}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      ) : null}

      {onUpdateApp ? (
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
                onUpdateApp()
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
        <div className="bg-sidebar flex aspect-4/3 w-full shrink-0 items-center justify-center overflow-hidden">
          <AppIcon
            iconSvg={app?.iconSvg}
            color={app?.color}
            className="size-14 rounded-2xl shadow-md"
          />
        </div>

        <div className="min-w-0 shrink-0 p-2">
          <p
            className="line-clamp-2 h-8 overflow-hidden text-xs/4 font-medium break-all"
            title={instance.name}
          >
            {instance.name}
          </p>
        </div>
      </div>
    </article>
  )
}

export function LibraryAppCardOverlay({
  instance,
  app,
}: {
  instance: AppInstance
  app: EdgeApp | undefined
}) {
  return (
    <div className="bg-panel ring-secondary pointer-events-none w-35 rotate-0 overflow-hidden rounded-xl shadow-lg ring-1">
      <LibraryAppCardView instance={instance} app={app} />
    </div>
  )
}

export function LibraryAppCard({
  instance,
  app,
  onAddToContent,
}: {
  instance: AppInstance
  app: EdgeApp | undefined
  onAddToContent: (appInstanceId: string) => void
}) {
  const navigate = useNavigate()

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appLibraryDragId(instance.id),
    data: { type: "library-app", appInstanceId: instance.id },
  })

  return (
    <div ref={setNodeRef} className={cn("min-w-0", isDragging && "opacity-40")}>
      <LibraryAppCardView
        instance={instance}
        app={app}
        onAddToContent={onAddToContent}
        {...(app
          ? {
              onUpdateApp: () => {
                void navigate(`/apps/${app.id}/instances/${instance.id}`)
              },
            }
          : {})}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
