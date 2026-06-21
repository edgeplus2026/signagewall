import { Trash2Icon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

interface ScreensBulkActionsBarProps {
  selectedCount: number
  onDelete: () => void
  onClear: () => void
}

export function ScreensBulkActionsBar({
  selectedCount,
  onDelete,
  onClear,
}: ScreensBulkActionsBarProps) {
  const { t } = useTranslation()

  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5">
      <span className="text-sm font-medium text-primary">
        {t("screens.bulk.selected", { count: selectedCount })}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="danger" size="sm" onClick={onDelete}>
          <Trash2Icon data-icon="inline-start" />
          {t("screens.bulk.delete")}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClear}>
          <XIcon />
          <span className="sr-only">{t("screens.bulk.clear")}</span>
        </Button>
      </div>
    </div>
  )
}
