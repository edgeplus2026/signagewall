import { UploadCloudIcon } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { CloudProviderCards } from "@/features/media/cloud/components/CloudProviderCards"
import { StagingGrid } from "@/features/media/components/StagingGrid"
import { MEDIA_ACCEPT_ATTRIBUTE } from "@/features/media/lib/media.constants"
import { useStagingStore } from "@/features/media/store/stagingStore"
import { cn } from "@/lib/utils"

export function MyDeviceTab() {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const addLocalFiles = useStagingStore((state) => state.addLocalFiles)
  const hasItems = useStagingStore((state) => state.items.length > 0)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      addLocalFiles(Array.from(fileList))
    },
    [addLocalFiles],
  )

  return (
    <div className="visible-scrollbar flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {/* Top: device dropzone (full width). */}
      <button
        type="button"
        onClick={() => {
          inputRef.current?.click()
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => {
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          "flex min-h-44 shrink-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-brand bg-brand/5"
            : "border-secondary bg-panel/50 hover:border-brand/50 hover:bg-highlight/30",
        )}
      >
        <span className="bg-sidebar text-secondary flex size-12 items-center justify-center rounded-xl">
          <UploadCloudIcon className="size-5" />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-primary text-sm font-medium">
            {t("media.dropzone.upload.title")}
          </span>
          <span className="text-secondary text-xs">
            {t("media.dropzone.upload.hint")}
          </span>
        </span>
      </button>

      {/* Below: the four cloud provider cards in a 4-up grid. */}
      <CloudProviderCards />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={MEDIA_ACCEPT_ATTRIBUTE}
        aria-label={t("media.dropzone.upload.title")}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ""
        }}
      />

      {hasItems ? (
        <div className="flex flex-col gap-3 border-t border-secondary pt-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-primary text-sm font-medium">
              {t("media.staging.title")}
            </p>
            <p className="text-secondary text-xs">
              {t("media.staging.description")}
            </p>
          </div>
          <StagingGrid />
        </div>
      ) : null}
    </div>
  )
}
