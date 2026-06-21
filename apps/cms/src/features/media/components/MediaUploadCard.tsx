import { UploadCloudIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

interface MediaUploadCardProps {
  onUpload: () => void
}

export function MediaUploadCard({ onUpload }: MediaUploadCardProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onUpload}
      className="group flex h-full min-w-[11rem] flex-col overflow-hidden rounded-xl border border-dashed border-secondary bg-panel/50 text-left transition-colors hover:border-brand/50 hover:bg-highlight/30"
    >
      <div className="relative flex aspect-4/3 w-full shrink-0 items-center justify-center overflow-hidden bg-sidebar/50">
        <UploadCloudIcon className="text-secondary size-10 transition-transform duration-300 ease-out group-hover:text-brand" />
      </div>

      <div className="flex h-[5.5rem] shrink-0 flex-col justify-center gap-1 p-2.5">
        <p className="line-clamp-2 text-sm/5 font-medium break-words">
          {t("media.dropzone.upload.title")}
        </p>
        <p className="text-secondary line-clamp-2 text-[11px] leading-4">
          {t("media.dropzone.upload.hint")}
        </p>
      </div>
    </button>
  )
}
