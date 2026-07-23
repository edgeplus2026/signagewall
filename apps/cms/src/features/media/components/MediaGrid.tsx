import {
  EyeIcon,
  FolderInputIcon,
  ListPlusIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MediaThumbnail } from "@/features/media/components/MediaThumbnail"
import { MediaUploadCard } from "@/features/media/components/MediaUploadCard"
import { mediaGridClassName } from "@/features/media/lib/mediaActionCardStyles"
import {
  attachMediaDragImage,
  setMediaDragData,
} from "@/features/media/lib/mediaDrag"
import type { MediaItem } from "@/features/media/types/media.types"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface MediaGridProps {
  items: MediaItem[]
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onOpenItem: (item: MediaItem) => void
  onRename: (item: MediaItem) => void
  onMove: (ids: string[]) => void
  onDelete: (ids: string[]) => void
  onAddToPlaylist: (ids: string[]) => void
  onAddToScreen: (ids: string[]) => void
  onUpload: () => void
}

export function MediaGrid({
  items,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpenItem,
  onRename,
  onMove,
  onDelete,
  onAddToPlaylist,
  onAddToScreen,
  onUpload,
}: MediaGridProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id))
  const someSelected = items.some((item) => selectedIds.has(item.id))

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => {
              onSelectAll(checked === true)
            }}
            aria-label={t("media.selectAll")}
          />
          <span className="text-xs text-secondary">{t("media.selectAll")}</span>
        </div>
      ) : null}

      <div className={mediaGridClassName}>
        {items.length > 0 ? <MediaUploadCard onUpload={onUpload} /> : null}

        {items.map((item) => {
          const isSelected = selectedIds.has(item.id)
          const dragCount = isSelected ? selectedIds.size : 1

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(event) => {
                const dragIds = isSelected
                  ? Array.from(selectedIds)
                  : [item.id]
                setMediaDragData(event, dragIds)
                attachMediaDragImage(event)
              }}
              className={cn(
                "group relative flex h-full min-w-[11rem] flex-col overflow-hidden rounded-xl border bg-panel transition-colors",
                isSelected ? "border-success" : "border-secondary",
              )}
            >
              <div
                data-media-drag-preview
                aria-hidden
                className="border-secondary bg-panel pointer-events-none fixed -left-[10000px] top-0 flex w-[11rem] flex-col overflow-hidden rounded-xl border shadow-lg"
              >
                <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden">
                  <MediaThumbnail item={item} />
                  {dragCount > 1 ? (
                    <span className="bg-brand absolute top-2 right-2 rounded-full px-2 py-0.5 text-[11px] font-medium text-white">
                      {dragCount}
                    </span>
                  ) : null}
                </div>
                <div className="flex h-[5.5rem] shrink-0 flex-col gap-1.5 p-2.5">
                  <p className="line-clamp-2 h-10 overflow-hidden text-sm/5 font-medium break-words">
                    {item.name}
                  </p>
                </div>
              </div>

              <div
                className="absolute top-2 left-2 z-10"
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    onSelect(item.id, checked === true)
                  }}
                  aria-label={t("media.selectItem", { name: item.name })}
                />
              </div>

              {isMobile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled
                  className="absolute top-2 right-2 z-10"
                  aria-label={t("common.actions")}
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                >
                  <MoreHorizontalIcon />
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-2 right-2 z-10 bg-panel opacity-0 group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <MoreHorizontalIcon />
                      <span className="sr-only">{t("common.actions")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-auto min-w-44">
                    <DropdownMenuItem
                      onClick={() => {
                        onOpenItem(item)
                      }}
                    >
                      <EyeIcon />
                      {t("media.actions.view")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onRename(item)
                      }}
                    >
                      <PencilIcon />
                      {t("media.actions.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onMove([item.id])
                      }}
                    >
                      <FolderInputIcon />
                      {t("media.actions.move")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onAddToPlaylist([item.id])
                      }}
                    >
                      <ListPlusIcon />
                      {t("media.actions.addToPlaylist")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onAddToScreen([item.id])
                      }}
                    >
                      <MonitorIcon />
                      {t("media.actions.addToScreen")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="danger"
                      onClick={() => {
                        onDelete([item.id])
                      }}
                    >
                      <Trash2Icon />
                      {t("media.actions.moveToTrash")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <button
                type="button"
                className="flex min-h-0 flex-1 cursor-pointer flex-col text-left"
                onClick={() => {
                  onOpenItem(item)
                }}
              >
                <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden">
                  <MediaThumbnail item={item} />
                </div>

                <div className="flex h-[5.5rem] shrink-0 flex-col gap-1.5 p-2.5">
                  <p
                    className="line-clamp-2 h-10 overflow-hidden text-sm/5 font-medium break-words"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <span
                    className={cn(
                      "w-fit rounded-md px-2 py-0.5 text-[11px] font-medium",
                      item.type === "image"
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success",
                    )}
                  >
                    {t(`media.types.${item.type}`)}
                  </span>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
