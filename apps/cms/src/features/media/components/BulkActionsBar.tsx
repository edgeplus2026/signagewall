import { FolderInputIcon, ListPlusIcon, MonitorIcon, Trash2Icon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

interface BulkActionsBarProps {
  selectedCount: number
  onMove: () => void
  onAddToPlaylist: () => void
  onAddToScreen: () => void
  onDelete: () => void
  onClear: () => void
}

export function BulkActionsBar({
  selectedCount,
  onMove,
  onAddToPlaylist,
  onAddToScreen,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
  const { t } = useTranslation()

  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5">
      <span className="text-sm font-medium text-primary">
        {t("media.bulk.selected", { count: selectedCount })}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onMove}>
          <FolderInputIcon data-icon="inline-start" />
          {t("media.bulk.move")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onAddToPlaylist}>
          <ListPlusIcon data-icon="inline-start" />
          {t("media.bulk.addToPlaylist")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onAddToScreen}>
          <MonitorIcon data-icon="inline-start" />
          {t("media.bulk.addToScreen")}
        </Button>
        <Button type="button" variant="danger" size="sm" onClick={onDelete}>
          <Trash2Icon data-icon="inline-start" />
          {t("media.bulk.delete")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
        >
          <XIcon />
          <span className="sr-only">{t("media.bulk.clear")}</span>
        </Button>
      </div>
    </div>
  )
}
