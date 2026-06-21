import { FolderIcon, ImageIcon, VideoIcon } from "lucide-react"
import { useState } from "react"

import type { MediaItem } from "@/features/media/types/media.types"
import { cn } from "@/lib/utils"

interface MediaThumbnailProps {
  item: MediaItem
  className?: string
  iconClassName?: string
}

function isCompactThumbnail(iconClassName: string): boolean {
  return /size-[1-6](?:\b|[/.])/.test(iconClassName)
}

/**
 * An <img> that falls back to `fallback` if the source fails to load. It owns
 * its own error state, so callers must key it by `src` (e.g. `key={src}`) to
 * reset the error when the URL changes — for example when an async-generated
 * thumbnail becomes available after upload processing finishes. Without the
 * remount a transient 404 would pin the fallback until a full page reload.
 */
function ThumbnailImage({
  src,
  className,
  fallback,
}: {
  src: string
  className: string
  fallback: React.ReactNode
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <>{fallback}</>
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => {
        setFailed(true)
      }}
    />
  )
}

function VideoThumbnail({
  previewUrl,
  className,
  iconClassName,
}: {
  previewUrl: string | undefined
  className: string
  iconClassName: string
}) {
  const compact = isCompactThumbnail(iconClassName)

  const placeholder = (
    <div className="relative flex size-full items-center justify-center bg-linear-to-br from-sidebar via-panel to-sidebar">
      <VideoIcon
        className={cn(
          "fill-secondary text-secondary opacity-100",
          compact ? "size-6" : iconClassName,
        )}
        strokeWidth={1.25}
      />
    </div>
  )

  if (!previewUrl) {
    return placeholder
  }

  return (
    <div className="relative size-full">
      <ThumbnailImage
        key={previewUrl}
        src={previewUrl}
        className={className}
        fallback={placeholder}
      />
    </div>
  )
}

function MediaFileThumbnail({
  item,
  className,
  iconClassName,
}: {
  item: MediaItem
  className: string
  iconClassName: string
}) {
  // Videos only ever render a generated image thumbnail — never the file URL,
  // which points at the video itself and would always fail as an <img> source
  // (e.g. while the item is still processing and no thumbnail exists yet).
  const previewUrl =
    item.type === "video" ? item.thumbnailUrl : (item.thumbnailUrl ?? item.fileUrl)

  if (item.type === "video") {
    return (
      <VideoThumbnail
        previewUrl={previewUrl}
        className={className}
        iconClassName={iconClassName}
      />
    )
  }

  if (!previewUrl) {
    return (
      <div className="flex size-full items-center justify-center bg-sidebar">
        <ImageIcon className={`text-secondary ${iconClassName}`} />
      </div>
    )
  }

  return (
    <ThumbnailImage
      key={previewUrl}
      src={previewUrl}
      className={cn(
        className,
        "transition-transform duration-300 ease-out group-hover:scale-125",
      )}
      fallback={
        <div className="flex size-full items-center justify-center bg-sidebar">
          <ImageIcon className={`text-secondary ${iconClassName}`} />
        </div>
      }
    />
  )
}

export function MediaThumbnail({
  item,
  className = "size-full object-cover",
  iconClassName = "size-10",
}: MediaThumbnailProps) {
  if (item.type === "folder") {
    return (
      <div className="flex size-full items-center justify-center bg-sidebar">
        <FolderIcon
          className={cn(
            "text-brand transition-transform duration-300 ease-out group-hover:scale-125",
            iconClassName,
          )}
        />
      </div>
    )
  }

  return (
    <MediaFileThumbnail
      item={item}
      className={className}
      iconClassName={iconClassName}
    />
  )
}
