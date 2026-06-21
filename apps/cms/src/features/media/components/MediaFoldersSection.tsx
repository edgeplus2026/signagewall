import {
  ArrowLeftIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderInputIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import type { MediaItem } from "@/features/media/types/media.types"
import { cn } from "@/lib/utils"

const foldersGridClassName =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

interface MediaFoldersSectionProps {
  folders: MediaItem[]
  isLoading?: boolean
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  showBack?: boolean
  onNavigateBack?: () => void
  onCreateFolder: () => void
  onOpenFolder: (folderId: string) => void
  onRename: (folder: MediaItem) => void
  onMove: (ids: string[]) => void
  onDelete: (ids: string[]) => void
  onDropOnFolder: (itemIds: string[], folderId: string) => void
}

function FoldersSkeleton() {
  return (
    <div className={foldersGridClassName}>
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-11 rounded-xl" />
    </div>
  )
}

export function MediaFoldersSection({
  folders,
  isLoading,
  collapsed,
  onCollapsedChange,
  showBack = false,
  onNavigateBack,
  onCreateFolder,
  onOpenFolder,
  onRename,
  onMove,
  onDelete,
  onDropOnFolder,
}: MediaFoldersSectionProps) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {showBack && onNavigateBack ? (
            <button
              type="button"
              onClick={onNavigateBack}
              className="bg-panel text-primary hover:bg-secondary/20 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
            >
              <ArrowLeftIcon className="size-3" />
              {t("media.folders.back")}
            </button>
          ) : null}
          <h2 className="text-primary truncate text-sm font-medium">
            {t("media.folders.title")}
          </h2>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="size-8 shrink-0"
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? t("media.folders.expand") : t("media.folders.collapse")
          }
          onClick={() => {
            onCollapsedChange(!collapsed)
          }}
        >
          <ChevronDownIcon
            className={cn("transition-transform", !collapsed && "rotate-180")}
          />
        </Button>
      </div>

      {!collapsed ? (
        isLoading ? (
          <FoldersSkeleton />
        ) : (
          <div className={foldersGridClassName}>
            <button
              type="button"
              onClick={onCreateFolder}
              className="border-secondary bg-panel/50 hover:border-brand/50 hover:bg-highlight/30 flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors"
            >
              <FolderPlusIcon className="text-secondary size-4 shrink-0 transition-transform duration-300 ease-out" />
              <span className="text-primary truncate text-sm font-medium">
                {t("media.dropzone.folder.title")}
              </span>
            </button>

            {folders.map((folder) => (
              <div
                key={folder.id}
                onDragOver={(event) => {
                  event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const raw = event.dataTransfer.getData("text/media-ids")
                  if (!raw) return
                  try {
                    const ids = JSON.parse(raw) as string[]
                    if (!ids.includes(folder.id)) {
                      onDropOnFolder(ids, folder.id)
                    }
                  } catch {
                    // ignore invalid drag data
                  }
                }}
                className="border-secondary bg-panel hover:border-brand/50 hover:bg-highlight/30 flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => {
                    onOpenFolder(folder.id)
                  }}
                >
                  <FolderIcon className="text-secondary size-4 shrink-0 transition-transform duration-300 ease-out" />
                  <span className="text-primary truncate text-sm font-medium" title={folder.name}>
                    {folder.name}
                  </span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 shrink-0"
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <MoreVerticalIcon />
                      <span className="sr-only">{t("common.actions")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-auto min-w-44">
                    <DropdownMenuItem
                      onClick={() => {
                        onOpenFolder(folder.id)
                      }}
                    >
                      <FolderOpenIcon />
                      {t("media.actions.open")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onRename(folder)
                      }}
                    >
                      <PencilIcon />
                      {t("media.actions.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onMove([folder.id])
                      }}
                    >
                      <FolderInputIcon />
                      {t("media.actions.move")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="danger"
                      onClick={() => {
                        onDelete([folder.id])
                      }}
                    >
                      <Trash2Icon />
                      {t("media.actions.moveToTrash")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}
