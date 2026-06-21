import {
  ArrowLeftIcon,
  ChevronDownIcon,
  FolderIcon,
  SearchIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { LibraryMediaCard } from "@/features/content/components/LibraryCards"
import type { LibraryTabPanelProps } from "@/features/content/registry/libraryTabRegistry"
import { useFolderPath, useMediaItems } from "@/features/media/hooks/useMedia"
import { filterMediaItems } from "@/features/media/lib/filterMediaItems"
import { cn } from "@/lib/utils"

export function MediaLibraryPanel({
  labels,
  onAddMedia,
  onEditMedia,
}: LibraryTabPanelProps) {
  const { t } = useTranslation()
  const [folderId, setFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [foldersCollapsed, setFoldersCollapsed] = useState(false)

  const { data: path = [] } = useFolderPath(folderId)
  const { data: mediaItems = [], isLoading } = useMediaItems({ parentId: folderId })

  const parentFolderId = path.length > 1 ? (path[path.length - 2]?.id ?? null) : null

  const { folders, files } = useMemo(() => {
    const sorted = filterMediaItems(mediaItems, { search }).sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1
      if (a.type !== "folder" && b.type === "folder") return 1
      return a.name.localeCompare(b.name)
    })

    return {
      folders: sorted.filter((item) => item.type === "folder"),
      files: sorted.filter((item) => item.type !== "folder"),
    }
  }, [mediaItems, search])

  return (
    <>
      <div className="relative">
        <SearchIcon className="text-secondary pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          placeholder={labels.librarySearch}
          className="h-7 pl-7 text-xs"
        />
      </div>

      {!search.trim() && folderId ? (
        <button
          type="button"
          onClick={() => {
            setFolderId(parentFolderId)
          }}
          className="bg-panel text-primary hover:bg-secondary/20 inline-flex w-fit shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
        >
          <ArrowLeftIcon className="size-3" />
          {labels.libraryBack}
        </button>
      ) : null}

      <div className="visible-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-4/3 rounded-xl" />
              ))}
            </div>
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="text-sm">
                {search.trim() ? labels.libraryEmptySearch : labels.libraryEmpty}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {folders.length > 0 ? (
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-primary truncate text-xs font-medium">
                    {t("media.folders.title")}
                  </h4>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="size-7 shrink-0"
                    aria-expanded={!foldersCollapsed}
                    aria-label={
                      foldersCollapsed
                        ? t("media.folders.expand")
                        : t("media.folders.collapse")
                    }
                    onClick={() => {
                      setFoldersCollapsed((current) => !current)
                    }}
                  >
                    <ChevronDownIcon
                      className={cn(
                        "size-3.5 transition-transform",
                        !foldersCollapsed && "rotate-180",
                      )}
                    />
                  </Button>
                </div>

                {!foldersCollapsed ? (
                  <div className="grid grid-cols-2 gap-2">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        className="border-secondary bg-panel hover:border-brand/50 hover:bg-highlight/30 flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors"
                        onClick={() => {
                          setFolderId(folder.id)
                        }}
                      >
                        <FolderIcon className="text-secondary mt-0.5 size-3.5 shrink-0" />
                        <span
                          className="text-primary truncate overflow-hidden text-xs/4 font-medium break-all"
                          title={folder.name}
                        >
                          {folder.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {folders.length > 0 && files.length > 0 ? <Separator /> : null}

            {files.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {files.map((item) => (
                  <LibraryMediaCard
                    key={item.id}
                    item={item}
                    onAddToContent={onAddMedia}
                    onEdit={onEditMedia}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
