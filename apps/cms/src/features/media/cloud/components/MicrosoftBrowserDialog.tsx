import { useQuery } from "@tanstack/react-query"
import {
  CheckIcon,
  ChevronRightIcon,
  FolderIcon,
  ImageIcon,
  Loader2Icon,
  VideoIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { GraphDriveItem } from "@/features/media/cloud/lib/microsoftGraph"
import {
  isMediaItem,
  listChildren,
  toCloudPick,
} from "@/features/media/cloud/lib/microsoftGraph"
import type { CloudPickResult } from "@/features/media/cloud/types/cloudPick.types"
import { formatFileSize } from "@/features/media/lib/mediaUtils"
import { cn } from "@/lib/utils"

interface MicrosoftBrowserDialogProps {
  token: string
  onClose: () => void
  onConfirm: (picks: CloudPickResult[]) => void
}

interface Crumb {
  id: string | null
  name: string
}

/**
 * Browses the signed-in user's OneDrive via Microsoft Graph (`/me/drive`),
 * which works identically for personal and work/school (business) accounts.
 * Sign-in happens once (MSAL popup); browsing here is plain Graph REST so there
 * is no second popup and no personal-vs-business host juggling.
 */
export function MicrosoftBrowserDialog({
  token,
  onClose,
  onConfirm,
}: MicrosoftBrowserDialogProps) {
  const { t } = useTranslation()
  const rootName = t("media.providers.onedrive.title")
  const [path, setPath] = useState<Crumb[]>([{ id: null, name: rootName }])
  const [selected, setSelected] = useState<Map<string, GraphDriveItem>>(
    new Map(),
  )

  const folderId = path[path.length - 1]?.id ?? null

  const {
    data: items = [],
    isPending,
    isError,
    error,
  } = useQuery({
    // Key on the token so signing in with a different account never serves the
    // previous account's cached listing (queries default to a 5-minute
    // staleTime). The folderId scopes the listing within an account.
    queryKey: ["ms-browse", token, folderId],
    queryFn: () => listChildren(token, folderId),
  })

  const folders = useMemo(() => items.filter((item) => item.folder), [items])
  const media = useMemo(() => items.filter(isMediaItem), [items])

  const toggle = (item: GraphDriveItem) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, item)
      }
      return next
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="flex h-[80vh] max-h-[80vh] w-full flex-col gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("media.providers.browseTitle")}</DialogTitle>
          <DialogDescription>
            {t("media.providers.browseHint")}
          </DialogDescription>
        </DialogHeader>

        <div className="text-secondary flex flex-wrap items-center gap-1 text-xs">
          {path.map((crumb, index) => (
            <span
              key={`${crumb.id ?? "root"}-${String(index)}`}
              className="flex items-center gap-1"
            >
              {index > 0 ? <ChevronRightIcon className="size-3" /> : null}
              <button
                type="button"
                className={cn(
                  "hover:text-primary",
                  index === path.length - 1 && "text-primary font-medium",
                )}
                onClick={() => {
                  setPath((prev) => prev.slice(0, index + 1))
                }}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div className="visible-scrollbar min-h-0 flex-1 overflow-y-auto">
          {isPending ? (
            <div className="flex h-full items-center justify-center">
              <Loader2Icon className="text-secondary size-6 animate-spin" />
            </div>
          ) : isError ? (
            <div className="text-danger flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-sm">
              <span>{t("media.providers.browseError")}</span>
              {error instanceof Error ? (
                <span className="text-secondary text-xs">{error.message}</span>
              ) : null}
            </div>
          ) : folders.length === 0 && media.length === 0 ? (
            <div className="text-secondary flex h-full items-center justify-center text-sm">
              {t("media.providers.browseEmpty")}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    setPath((prev) => [
                      ...prev,
                      { id: folder.id, name: folder.name },
                    ])
                  }}
                  className="hover:bg-highlight/30 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm"
                >
                  <FolderIcon className="text-brand size-4" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}

              {media.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
                  {media.map((item) => {
                    const isSelected = selected.has(item.id)
                    const isVideo =
                      (item.file?.mimeType ?? "").startsWith("video/") ||
                      Boolean(item.video)
                    const thumb = item.thumbnails?.[0]?.medium?.url
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          toggle(item)
                        }}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-xl border text-left",
                          isSelected
                            ? "border-brand ring-brand/40 ring-2"
                            : "border-secondary",
                        )}
                      >
                        <div className="bg-sidebar/50 relative flex aspect-4/3 items-center justify-center overflow-hidden">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : isVideo ? (
                            <VideoIcon className="text-secondary size-7" />
                          ) : (
                            <ImageIcon className="text-secondary size-7" />
                          )}
                          {isSelected ? (
                            <span className="bg-brand text-brand-contrast absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full">
                              <CheckIcon className="size-3.5" />
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-0.5 p-2">
                          <p
                            className="truncate text-xs font-medium text-primary"
                            title={item.name}
                          >
                            {item.name}
                          </p>
                          {item.size ? (
                            <p className="text-secondary text-[11px]">
                              {formatFileSize(item.size)}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("media.form.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => {
              onConfirm(
                Array.from(selected.values()).map((item) =>
                  toCloudPick(item, token),
                ),
              )
            }}
          >
            {t("media.providers.addSelected", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
