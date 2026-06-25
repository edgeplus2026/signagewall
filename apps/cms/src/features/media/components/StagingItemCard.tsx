import { ImageIcon, VideoIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { PROVIDER_ICONS } from "@/features/media/cloud/lib/providerIconMap"
import { formatFileSize } from "@/features/media/lib/mediaUtils"
import type { StagedItem } from "@/features/media/store/stagingStore"
import { cn } from "@/lib/utils"

interface StagingItemCardProps {
  item: StagedItem
  error?: string | undefined
  onRemove: (id: string) => void
}

export function StagingItemCard({ item, error, onRemove }: StagingItemCardProps) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  const isVideo = item.mimeType.startsWith("video/")
  const ProviderIcon =
    item.kind === "cloud" ? PROVIDER_ICONS[item.pick.provider] : null
  const sizeLabel = item.sizeBytes > 0 ? formatFileSize(item.sizeBytes) : null

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-panel",
        error ? "border-danger/60" : "border-secondary",
      )}
    >
      <div className="bg-sidebar/50 relative flex aspect-4/3 w-full items-center justify-center overflow-hidden">
        {item.previewUrl && !failed ? (
          <img
            key={item.previewUrl}
            src={item.previewUrl}
            alt=""
            className="size-full object-cover"
            onError={() => {
              setFailed(true)
            }}
          />
        ) : isVideo ? (
          <VideoIcon className="text-secondary size-8" strokeWidth={1.25} />
        ) : (
          <ImageIcon className="text-secondary size-8" />
        )}

        {ProviderIcon ? (
          <span className="bg-panel/90 absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-md shadow-sm">
            <ProviderIcon className="size-3.5" />
          </span>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("media.staging.remove", { name: item.name })}
          className="bg-panel/90 hover:bg-panel absolute top-1.5 right-1.5 size-6 rounded-md"
          onClick={() => {
            onRemove(item.id)
          }}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-0.5 p-2.5">
        <p className="truncate text-sm font-medium text-primary" title={item.name}>
          {item.name}
        </p>
        {error ? (
          <p className="text-danger line-clamp-2 text-[11px] leading-4">{error}</p>
        ) : (
          <p className="text-secondary text-xs">
            {t(isVideo ? "media.types.video" : "media.types.image")}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </p>
        )}
      </div>
    </div>
  )
}
