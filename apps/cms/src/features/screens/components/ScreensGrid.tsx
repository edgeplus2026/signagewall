import { MonitorPlayIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CreateCard } from "@/components/common/CreateCard"
import { Checkbox } from "@/components/ui/checkbox"
import { mediaGridClassName } from "@/features/media/lib/mediaActionCardStyles"
import { ScreenCard } from "@/features/screens/components/ScreenCard"
import type {
  ScreenManageTab,
  ScreenSummary,
} from "@/features/screens/types/screen.types"

interface ScreensGridProps {
  screens: ScreenSummary[]
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onOpen: (screen: ScreenSummary, tab: ScreenManageTab) => void
  onDelete: (ids: string[]) => void
  onCreate: () => void
}

export function ScreensGrid({
  screens,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpen,
  onDelete,
  onCreate,
}: ScreensGridProps) {
  const { t } = useTranslation()
  const allSelected =
    screens.length > 0 && screens.every((screen) => selectedIds.has(screen.id))
  const someSelected = screens.some((screen) => selectedIds.has(screen.id))

  return (
    <div className="flex flex-col gap-4">
      {screens.length > 0 ? (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => {
              onSelectAll(checked === true)
            }}
            aria-label={t("screens.selectAll")}
          />
          <span className="text-xs text-secondary">{t("screens.selectAll")}</span>
        </div>
      ) : null}

      <div className={mediaGridClassName}>
        <CreateCard
          icon={MonitorPlayIcon}
          title={t("screens.create.title")}
          hint={t("screens.create.description")}
          onClick={onCreate}
        />
        {screens.map((screen) => (
          <ScreenCard
            key={screen.id}
            screen={screen}
            isSelected={selectedIds.has(screen.id)}
            onSelect={onSelect}
            onOpen={onOpen}
            onDelete={(id) => {
              onDelete([id])
            }}
          />
        ))}
      </div>
    </div>
  )
}
