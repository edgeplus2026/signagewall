import type { LucideIcon } from 'lucide-react'

interface CreateCardProps {
  /** Leading icon shown centered in the preview area. */
  icon: LucideIcon
  title: string
  hint: string
  onClick: () => void
}

/**
 * Canonical "add" card rendered as the first item of a content grid
 * (media, screens, playlists, app instances). Mirrors the regular card
 * shape — a preview area on top, a text footer below — with a dashed border
 * so it reads as an action rather than an item.
 */
export function CreateCard({ icon: Icon, title, hint, onClick }: CreateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full min-w-[11rem] cursor-pointer flex-col overflow-hidden rounded-xl border border-dashed border-secondary bg-panel/50 text-left transition-colors hover:border-brand/50 hover:bg-highlight/30"
    >
      <div className="bg-sidebar/50 relative flex aspect-4/3 w-full shrink-0 items-center justify-center overflow-hidden">
        <Icon className="text-secondary size-10 transition-colors duration-300 ease-out group-hover:text-brand" />
      </div>

      <div className="flex h-[5.5rem] shrink-0 flex-col justify-center gap-1 p-2.5">
        <p className="line-clamp-2 text-sm/5 font-medium break-words">{title}</p>
        <p className="text-secondary line-clamp-2 text-[11px] leading-4">{hint}</p>
      </div>
    </button>
  )
}
