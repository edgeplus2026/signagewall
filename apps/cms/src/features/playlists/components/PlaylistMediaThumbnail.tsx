import { FolderIcon, ImageIcon, VideoIcon } from "lucide-react"

import type { MediaItem } from "@/features/media/types/media.types"
import { cn } from "@/lib/utils"

interface PlaylistMediaThumbnailProps {
  item: MediaItem
  className?: string
}

export function PlaylistMediaThumbnail({
  item,
  className = "size-full object-cover",
}: PlaylistMediaThumbnailProps) {
  if (item.type === "folder") {
    return (
      <div className="flex size-full items-center justify-center bg-sidebar">
        <FolderIcon className="size-8 text-brand" />
      </div>
    )
  }

  if (item.type === "video") {
    if (item.thumbnailUrl) {
      return <img src={item.thumbnailUrl} alt="" className={className} />
    }

    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-linear-to-br from-sidebar via-panel to-sidebar",
        )}
      >
        <VideoIcon className="size-8 fill-secondary text-secondary opacity-100" strokeWidth={1.25} />
      </div>
    )
  }

  if (item.thumbnailUrl) {
    return <img src={item.thumbnailUrl} alt="" className={className} />
  }

  return (
    <div className="flex size-full items-center justify-center bg-sidebar">
      <ImageIcon className="size-8 text-secondary" />
    </div>
  )
}
