import type { LucideIcon } from "lucide-react"

import {
  mediaActionCardClassName,
  mediaActionCardIconClassName,
} from "@/features/media/lib/mediaActionCardStyles"
import { cn } from "@/lib/utils"

interface MediaActionCardProps {
  icon: LucideIcon
  title: string
  hint: string
  disabled?: boolean
  onClick: () => void
  iconClassName?: string
}

export function MediaActionCard({
  icon: Icon,
  title,
  hint,
  disabled,
  onClick,
  iconClassName,
}: MediaActionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        mediaActionCardClassName,
        "border border-secondary bg-panel hover:border-brand/50 hover:bg-highlight/30"
      )}
    >
      <div className={cn(mediaActionCardIconClassName, iconClassName)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{title}</p>
        <p className="line-clamp-2 text-xs text-secondary">{hint}</p>
      </div>
    </button>
  )
}
