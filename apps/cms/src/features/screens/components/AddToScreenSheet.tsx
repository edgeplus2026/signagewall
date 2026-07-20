import { CheckIcon, MonitorIcon, SearchIcon } from "lucide-react"
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
  useAddAppsToScreens,
  useAddMediaToScreens,
  useAddPlaylistsToScreens,
  useScreens,
} from "@/features/screens/hooks/useScreens"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"

type AddToScreenMode = "media" | "playlists" | "apps"

interface AddToScreenSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: AddToScreenMode
  mediaIds?: string[]
  playlistIds?: string[]
  appInstanceIds?: string[]
  onSuccess?: () => void
}

export function AddToScreenSheet({
  open,
  onOpenChange,
  mode,
  mediaIds = [],
  playlistIds = [],
  appInstanceIds = [],
  onSuccess,
}: AddToScreenSheetProps) {
  const { t } = useTranslation()
  const { data: screens = [], isLoading } = useScreens()
  const addMedia = useAddMediaToScreens()
  const addPlaylists = useAddPlaylistsToScreens()
  const addApps = useAddAppsToScreens()
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("")
      setSelectedIds(new Set())
    }
    onOpenChange(nextOpen)
  }

  const filteredScreens = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return screens
    return screens.filter((screen) =>
      screen.name.toLowerCase().includes(query),
    )
  }, [screens, search])

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
    if (selectedIds.size === 0) return

    try {
      const screenIdList = Array.from(selectedIds)
      if (mode === "media") {
        if (mediaIds.length === 0) return
        await addMedia.mutateAsync({ screenIds: screenIdList, mediaIds })
      } else if (mode === "apps") {
        if (appInstanceIds.length === 0) return
        await addApps.mutateAsync({ screenIds: screenIdList, appInstanceIds })
      } else {
        if (playlistIds.length === 0) return
        await addPlaylists.mutateAsync({
          screenIds: screenIdList,
          playlistIds,
        })
      }
      toast.success(
        t("screens.addToScreen.success", { count: selectedIds.size }),
      )
      handleOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("screens.addToScreen.error")))
    }
  }

  const hasActiveSearch = search.trim().length > 0
  const isPending =
    addMedia.isPending || addPlaylists.isPending || addApps.isPending
  const itemCount =
    mode === "media"
      ? mediaIds.length
      : mode === "apps"
        ? appInstanceIds.length
        : playlistIds.length

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("screens.addToScreen.title")}</SheetTitle>
          <SheetDescription>
            {t("screens.addToScreen.description", { count: itemCount })}
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
              placeholder={t("screens.addToScreen.search")}
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
            ) : filteredScreens.length === 0 ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MonitorIcon aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">
                    {hasActiveSearch
                      ? t("screens.addToScreen.emptySearch")
                      : t("screens.addToScreen.empty")}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              filteredScreens.map((screen) => {
                const isSelected = selectedIds.has(screen.id)

                return (
                  <button
                    key={screen.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      toggle(screen.id)
                    }}
                    className={cn(
                      "bg-panel flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                      isSelected
                        ? "border-success ring-success/30 ring-1"
                        : "border-secondary hover:border-brand/50",
                    )}
                  >
                    <div className="bg-sidebar relative size-12 shrink-0 overflow-hidden rounded-lg">
                      {screen.itemCount === 0 ? (
                        <div className="flex size-full items-center justify-center px-1">
                          <span className="text-secondary text-center text-[10px] font-medium">
                            {t("screens.emptyScreen")}
                          </span>
                        </div>
                      ) : screen.thumbnailUrl ? (
                        <img
                          src={screen.thumbnailUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <MonitorIcon className="text-secondary size-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="text-primary truncate text-sm font-medium"
                        title={screen.name}
                      >
                        {screen.name}
                      </p>
                      <p className="text-secondary text-xs">
                        {screen.itemCount === 0
                          ? t("screens.emptyScreen")
                          : t("screens.content.itemCount", {
                              count: screen.itemCount,
                            })}
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

        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
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
            disabled={selectedIds.size === 0 || isPending}
            onClick={() => {
              void handleSubmit()
            }}
          >
            {t("screens.addToScreen.submit", { count: selectedIds.size })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
