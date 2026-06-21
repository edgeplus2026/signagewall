import { UploadCloudIcon } from "lucide-react"
import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

interface MediaPageDropZoneProps {
  children: ReactNode
  onFilesDropped: (files: File[]) => void
  className?: string
}

function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files")
}

export function MediaPageDropZone({
  children,
  onFilesDropped,
  className,
}: MediaPageDropZoneProps) {
  const { t } = useTranslation()
  const dragDepthRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const resetDrag = useCallback(() => {
    dragDepthRef.current = 0
    setIsDragging(false)
  }, [])

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current += 1
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current -= 1

    if (dragDepthRef.current <= 0) {
      resetDrag()
    }
  }, [resetDrag])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!isFileDrag(event)) {
        return
      }

      event.preventDefault()
      resetDrag()

      const files = Array.from(event.dataTransfer.files)
      if (files.length > 0) {
        onFilesDropped(files)
      }
    },
    [onFilesDropped, resetDrag],
  )

  return (
    <div
      className={cn("relative min-h-[calc(100dvh-10rem)]", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      <div
        aria-hidden={!isDragging}
        className={cn(
          "pointer-events-none fixed inset-0 z-50 transition-opacity duration-200",
          isDragging ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="absolute inset-0 bg-panel/70 backdrop-blur-[2px]" />

        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className={cn(
              "border-brand bg-panel flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-10 text-center transition-transform duration-200",
              isDragging ? "scale-100" : "scale-95",
            )}
          >
            <div className="bg-brand/10 flex size-16 items-center justify-center rounded-full">
              <UploadCloudIcon className="text-brand size-8" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-primary text-lg font-medium">
                {t("media.dropzone.upload.activeTitle")}
              </p>
              <p className="text-secondary text-sm">{t("media.dropzone.upload.hint")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
