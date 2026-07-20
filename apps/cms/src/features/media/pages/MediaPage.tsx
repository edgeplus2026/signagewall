import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  MediaBrowser,
  type MediaBrowserHandle,
} from "@/features/media/components/MediaBrowser"
import { MediaPageDropZone } from "@/features/media/components/MediaPageDropZone"
import { cn } from "@/lib/utils"

export default function MediaPage() {
  const { t } = useTranslation()
  const browserRef = useRef<MediaBrowserHandle>(null)
  const [itemCount, setItemCount] = useState(0)

  const handleItemCountChange = useCallback((count: number) => {
    setItemCount(count)
  }, [])

  const handleFilesDropped = useCallback((files: File[]) => {
    browserRef.current?.uploadFiles(files)
  }, [])

  return (
    <MediaPageDropZone
      className="flex w-full min-w-0 flex-col gap-7 lg:px-10"
      onFilesDropped={handleFilesDropped}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-primary text-xl font-medium tracking-tight">
            {t("media.title")}
          </h1>
          <span
            className={cn(
              "bg-success/10 text-success inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
            )}
          >
            {t("media.itemCount", { count: itemCount })}
          </span>
        </div>
        <p className="text-secondary text-sm">{t("media.description")}</p>
      </div>

      <MediaBrowser ref={browserRef} onItemCountChange={handleItemCountChange} />
    </MediaPageDropZone>
  )
}
