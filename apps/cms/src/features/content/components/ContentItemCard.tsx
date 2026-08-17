import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  BanIcon,
  CircleCheckIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react"
import { forwardRef, type HTMLAttributes } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type {
  ContentCardLabels,
  TranslateFn,
} from "@/features/content/registry/contentType.types"
import { getContentTypeDefinition } from "@/features/content/registry/contentTypeRegistry"
import type { ContentDraftItem } from "@/features/content/types/contentDraft.types"
import type { MediaItem } from "@/features/media/types/media.types"
import { cn } from "@/lib/utils"

interface ContentItemCardViewProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onDurationChange"
> {
  item: ContentDraftItem
  meta: unknown
  onItemDurationChange?: ((clientId: string, duration: number) => void) | undefined
  onRemove?: (clientId: string) => void
  onToggleDisabled?: (clientId: string) => void
  onUpdate?: (media: MediaItem) => void
  onUpdatePlaylist?: (playlistId: string) => void
  onUpdateApp?: (appId: string, instanceId: string) => void
  isDragging?: boolean
  labels: ContentCardLabels
}

export const ContentItemCardView = forwardRef<
  HTMLDivElement,
  ContentItemCardViewProps
>(function ContentItemCardView(
  {
    item,
    meta,
    onItemDurationChange,
    onRemove,
    onToggleDisabled,
    onUpdate,
    onUpdatePlaylist,
    onUpdateApp,
    className,
    style,
    isDragging = false,
    labels,
    ...props
  },
  ref
) {
  const { t } = useTranslation()
  const definition = getContentTypeDefinition(item.type)
  const ctx = { item, meta, labels, t: t as TranslateFn }

  const title = definition.card.title(ctx)
  const typeLabel = definition.card.typeLabel(ctx)
  const badgeClassName = definition.card.badgeClassName(ctx)
  const showDurationInput = definition.capabilities.showsDurationInput(item, meta)
  const durationEditable = definition.capabilities.canEditDuration(item, meta)
  const canEditDuration = durationEditable && !!onItemDurationChange
  const isDisabled = Boolean(item.disabled)

  // Bridge the container-supplied callbacks into the registry's single
  // `onUpdate(meta)` channel: media edits the resolved MediaItem, playlists
  // open by id, apps open their instance config page (meta is { instance, app }).
  const onMetaUpdate =
    item.type === "media" && onUpdate
      ? (value: unknown) => {
          onUpdate(value as MediaItem)
        }
      : item.type === "playlist" && onUpdatePlaylist
        ? (value: unknown) => {
            onUpdatePlaylist((value as { id: string }).id)
          }
        : item.type === "app" && onUpdateApp
          ? (value: unknown) => {
              const meta = value as {
                instance: { id: string }
                app?: { id: string }
              }
              if (meta.app) onUpdateApp(meta.app.id, meta.instance.id)
            }
          : undefined

  const menuItems = definition.card.MenuItems
    ? definition.card.MenuItems({ ...ctx, onUpdate: onMetaUpdate })
    : null
  const showActionsMenu = !!menuItems || !!onRemove || !!onToggleDisabled

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "group relative flex h-full min-w-44 flex-col overflow-hidden rounded-xl border border-secondary bg-panel",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isDisabled && !isDragging && "opacity-30",
        className
      )}
      {...props}
    >
      {showActionsMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1.5 right-1.5 z-10 size-7 bg-panel/80 max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
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
          <DropdownMenuContent align="end">
            {menuItems}
            {onToggleDisabled ? (
              <DropdownMenuItem
                onClick={() => {
                  onToggleDisabled(item.clientId)
                }}
              >
                {isDisabled ? <CircleCheckIcon /> : <BanIcon />}
                {isDisabled ? labels.enableItem : labels.disableItem}
              </DropdownMenuItem>
            ) : null}
            {onRemove ? (
              <>
                {onToggleDisabled ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  variant="danger"
                  onClick={() => {
                    onRemove(item.clientId)
                  }}
                >
                  <Trash2Icon />
                  {labels.removeItem}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden bg-sidebar">
        {definition.card.Thumbnail({ item, meta, labels })}
        {isDisabled ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="rounded-md bg-danger px-2 py-0.5 text-[11px] font-medium text-white shadow-sm -rotate-45">
              {labels.disabledBadge}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex h-24 shrink-0 flex-col gap-1.5 p-2.5">
        <p
          className="line-clamp-2 h-11 overflow-hidden text-sm/5 font-medium break-all"
          title={title}
        >
          {title}
        </p>
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "inline-flex w-fit shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
              badgeClassName
            )}
          >
            {typeLabel}
          </span>
          {showDurationInput ? (
            <div
              className="flex shrink-0 items-center"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
            >
              <Input
                type="number"
                min={1}
                max={3600}
                value={item.duration}
                disabled={!canEditDuration}
                onChange={(event) => {
                  const value = Number.parseInt(event.target.value, 10)
                  if (!Number.isNaN(value) && onItemDurationChange) {
                    onItemDurationChange(item.clientId, value)
                  }
                }}
                className="h-7 w-14 px-1 text-center text-xs disabled:opacity-100"
                aria-label={labels.durationLabel}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
})

interface ContentItemCardProps {
  item: ContentDraftItem
  meta: unknown
  onDurationChange?: ((clientId: string, duration: number) => void) | undefined
  onRemove: (clientId: string) => void
  onToggleDisabled?: (clientId: string) => void
  onUpdate?: (media: MediaItem) => void
  onUpdatePlaylist?: (playlistId: string) => void
  onUpdateApp?: (appId: string, instanceId: string) => void
  labels: ContentCardLabels
}

export function ContentItemCard({
  item,
  meta,
  onDurationChange,
  onRemove,
  onToggleDisabled,
  onUpdate,
  onUpdatePlaylist,
  onUpdateApp,
  labels,
}: ContentItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.clientId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <ContentItemCardView
      ref={setNodeRef}
      item={item}
      meta={meta}
      onItemDurationChange={onDurationChange}
      onRemove={onRemove}
      {...(onToggleDisabled ? { onToggleDisabled } : {})}
      {...(onUpdate ? { onUpdate } : {})}
      {...(onUpdatePlaylist ? { onUpdatePlaylist } : {})}
      {...(onUpdateApp ? { onUpdateApp } : {})}
      labels={labels}
      style={style}
      isDragging={isDragging}
      {...attributes}
      {...listeners}
    />
  )
}

export function ContentItemCardOverlay({
  item,
  meta,
  labels,
  width,
  height,
}: {
  item: ContentDraftItem
  meta: unknown
  labels: ContentCardLabels
  width?: number
  height?: number
}) {
  return (
    <div
      className="pointer-events-none"
      style={width && height ? { width, height } : undefined}
    >
      <ContentItemCardView item={item} meta={meta} labels={labels} />
    </div>
  )
}
