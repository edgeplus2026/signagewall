import { MonitorIcon, Trash2Icon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

interface PlaylistsBulkActionsBarProps {
  selectedCount: number
  onAddToScreen: () => void
  onDelete: () => void
  onClear: () => void
}

export function PlaylistsBulkActionsBar({
  selectedCount,
  onAddToScreen,
  onDelete,
  onClear,
}: PlaylistsBulkActionsBarProps) {
  const { t } = useTranslation()

  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5">
      <span className="text-sm font-medium text-primary">
        {t("playlists.bulk.selected", { count: selectedCount })}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onAddToScreen}>
          <MonitorIcon data-icon="inline-start" />
          {t("playlists.bulk.addToScreen")}
        </Button>
        <Button type="button" variant="danger" size="sm" onClick={onDelete}>
          <Trash2Icon data-icon="inline-start" />
          {t("playlists.bulk.delete")}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClear}>
          <XIcon />
          <span className="sr-only">{t("playlists.bulk.clear")}</span>
        </Button>
      </div>
    </div>
  )
}
