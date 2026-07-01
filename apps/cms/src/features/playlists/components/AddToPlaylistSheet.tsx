import { CheckIcon, ListVideoIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useAddAppsToPlaylists,
  useAddMediaToPlaylists,
  usePlaylists,
} from "@/features/playlists/hooks/usePlaylists"
import { getPlaylistItemCount } from "@/features/playlists/lib/playlistUtils"
import type { PlaylistSummary } from "@/features/playlists/types/playlist.types"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"

interface AddToPlaylistSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Media items to add (media mode). */
  mediaIds?: string[]
  /** App instances to add (apps mode). Mutually exclusive with `mediaIds`. */
  appInstanceIds?: string[]
  onSuccess?: () => void
}

function PlaylistThumbnail({ playlist }: { playlist: PlaylistSummary }) {
  if (playlist.thumbnailUrl) {
    return (
      <img
        src={playlist.thumbnailUrl}
        alt=""
        className="size-full object-cover"
      />
    )
  }

  return (
    <div className="bg-sidebar flex size-full items-center justify-center">
      <ListVideoIcon className="text-secondary size-5" />
    </div>
  )
}

export function AddToPlaylistSheet({
  open,
  onOpenChange,
  mediaIds = [],
  appInstanceIds = [],
  onSuccess,
}: AddToPlaylistSheetProps) {
  const { t } = useTranslation()
  const { data: playlists = [], isLoading } = usePlaylists()
  const addMedia = useAddMediaToPlaylists()
  const addApps = useAddAppsToPlaylists()
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Apps mode when app instances are supplied; media mode otherwise.
  const isApps = appInstanceIds.length > 0
  const itemCount = isApps ? appInstanceIds.length : mediaIds.length

  // Reset on close so each open starts fresh (mirrors MoveMediaSheet).
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("")
      setSelectedIds(new Set())
    }
    onOpenChange(nextOpen)
  }

  const filteredPlaylists = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return playlists
    return playlists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query),
    )
  }, [playlists, search])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (selectedIds.size === 0 || itemCount === 0) return

    try {
      const playlistIds = Array.from(selectedIds)
      if (isApps) {
        await addApps.mutateAsync({ playlistIds, appInstanceIds })
      } else {
        await addMedia.mutateAsync({ playlistIds, mediaIds })
      }
      toast.success(
        t("playlists.addToPlaylist.success", { count: selectedIds.size }),
      )
      handleOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t("playlists.addToPlaylist.error")),
      )
    }
  }

  const hasActiveSearch = search.trim().length > 0

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("playlists.addToPlaylist.title")}</SheetTitle>
          <SheetDescription>
            {t("playlists.addToPlaylist.description", {
              count: itemCount,
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4">
          <div className="relative">
            <SearchIcon className="text-secondary pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
              }}
              placeholder={t("playlists.addToPlaylist.search")}
              className="h-8 w-full pl-8"
            />
          </div>

          <div className="visible-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
            {isLoading ? (
              <>
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </>
            ) : filteredPlaylists.length === 0 ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ListVideoIcon aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">
                    {hasActiveSearch
                      ? t("playlists.addToPlaylist.emptySearch")
                      : t("playlists.addToPlaylist.empty")}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              filteredPlaylists.map((playlist) => {
                const isSelected = selectedIds.has(playlist.id)
                const itemCount = getPlaylistItemCount(playlist)

                return (
                  <button
                    key={playlist.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      toggle(playlist.id)
                    }}
                    className={cn(
                      "bg-panel flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                      isSelected
                        ? "border-success ring-success/30 ring-1"
                        : "border-secondary hover:border-brand/50",
                    )}
                  >
                    <div className="bg-sidebar relative size-12 shrink-0 overflow-hidden rounded-lg">
                      <PlaylistThumbnail playlist={playlist} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="text-primary truncate text-sm font-medium"
                        title={playlist.name}
                      >
                        {playlist.name}
                      </p>
                      <p className="text-secondary text-xs">
                        {t("playlists.content.itemCount", { count: itemCount })}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        isSelected
                          ? "border-success bg-success text-white"
                          : "border-secondary",
                      )}
                    >
                      {isSelected ? <CheckIcon className="size-3.5" /> : null}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleOpenChange(false)
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={
              selectedIds.size === 0 ||
              addMedia.isPending ||
              addApps.isPending
            }
            onClick={() => {
              void handleSubmit()
            }}
          >
            {t("playlists.addToPlaylist.submit", { count: selectedIds.size })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
