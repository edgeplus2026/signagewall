import {
  EyeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScreenPresenceBadge } from "@/features/screens/components/ScreenPresenceBadge"
import { useScreenPresence } from "@/features/screens/providers/presenceContext"
import type {
  ScreenManageTab,
  ScreenSummary,
} from "@/features/screens/types/screen.types"
import { cn } from "@/lib/utils"

interface ScreenCardProps {
  screen: ScreenSummary
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onOpen: (screen: ScreenSummary, tab: ScreenManageTab) => void
  onPreview: (screen: ScreenSummary) => void
  onDelete: (id: string) => void
}

export function ScreenCard({
  screen,
  isSelected,
  onSelect,
  onOpen,
  onPreview,
  onDelete,
}: ScreenCardProps) {
  const { t } = useTranslation()
  const presence = useScreenPresence(screen.id)

  return (
    <article
      className={cn(
        "group relative flex h-full min-w-[11rem] flex-col overflow-hidden rounded-xl border bg-panel transition-colors",
        isSelected ? "border-success" : "border-secondary",
      )}
    >
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => {
            onSelect(screen.id, checked === true)
          }}
          aria-label={t("screens.selectItem", { name: screen.name })}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 z-10 bg-panel max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">{t("common.actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem
            onClick={() => {
              onPreview(screen)
            }}
          >
            <EyeIcon />
            {t("screens.actions.preview")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onOpen(screen, "settings")
            }}
          >
            <PencilIcon />
            {t("screens.actions.update")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="danger"
            onClick={() => {
              onDelete(screen.id)
            }}
          >
            <Trash2Icon />
            {t("screens.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        className="flex min-h-0 flex-1 cursor-pointer flex-col text-left"
        onClick={() => {
          onOpen(screen, "content")
        }}
      >
        <div className="relative flex aspect-4/3 w-full shrink-0 items-center justify-center overflow-hidden bg-sidebar">
          {screen.itemCount === 0 ? (
            <span className="text-secondary px-3 text-center text-xs font-medium">
              {t("screens.emptyScreen")}
            </span>
          ) : screen.thumbnailUrl ? (
            <img
              src={screen.thumbnailUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <MonitorIcon className="size-10 text-secondary" />
          )}
        </div>

        <div className="flex h-[5.5rem] shrink-0 flex-col gap-1.5 p-2.5">
          <p
            className="line-clamp-2 h-10 overflow-hidden text-sm/5 font-medium break-words"
            title={screen.name}
          >
            {screen.name}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-secondary">
              {screen.itemCount === 0
                ? t("screens.emptyScreen")
                : t("screens.content.itemCount", { count: screen.itemCount })}
            </span>
            <ScreenPresenceBadge device={presence} />
          </div>
        </div>
      </button>
    </article>
  )
}
