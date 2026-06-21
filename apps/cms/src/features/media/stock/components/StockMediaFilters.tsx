import { SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  StockColor,
  StockMediaTypeFilter,
  StockOrientation,
} from "@/features/media/stock/types/stockMedia.types"

const ORIENTATIONS: StockOrientation[] = ["landscape", "portrait", "square"]

const COLORS: StockColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "black",
  "white",
  "gray",
]

interface StockMediaFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  mediaType: StockMediaTypeFilter
  onMediaTypeChange: (value: StockMediaTypeFilter) => void
  orientation: StockOrientation | "all"
  onOrientationChange: (value: StockOrientation | "all") => void
  color: StockColor | "all"
  onColorChange: (value: StockColor | "all") => void
  /**
   * Orientation/color can only be applied to a search query (the provider's
   * discovery feeds don't support them), so they're disabled until the user
   * searches.
   */
  refinementsDisabled: boolean
}

export function StockMediaFilters({
  search,
  onSearchChange,
  mediaType,
  onMediaTypeChange,
  orientation,
  onOrientationChange,
  color,
  onColorChange,
  refinementsDisabled,
}: StockMediaFiltersProps) {
  const { t } = useTranslation()
  const showColor = mediaType === "image"
  const refinementHint = refinementsDisabled
    ? t("media.stock.filters.searchToRefine")
    : undefined

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <div className="relative min-w-60">
        <SearchIcon className="text-secondary pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => {
            onSearchChange(event.target.value)
          }}
          placeholder={t("media.stock.searchPlaceholder")}
          className="h-8 w-full pl-8"
        />
      </div>
        <Select
          value={mediaType}
          onValueChange={(value) => {
            onMediaTypeChange(value as StockMediaTypeFilter)
          }}
        >
          <SelectTrigger size="default" className="h-8 w-36">
            <SelectValue placeholder={t("media.stock.filters.mediaType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("media.stock.mediaType.all")}</SelectItem>
            <SelectItem value="image">
              {t("media.stock.mediaType.image")}
            </SelectItem>
            <SelectItem value="video">
              {t("media.stock.mediaType.video")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={orientation}
          disabled={refinementsDisabled}
          onValueChange={(value) => {
            onOrientationChange(value as StockOrientation | "all")
          }}
        >
          <SelectTrigger size="default" className="h-8 w-36" title={refinementHint}>
            <SelectValue placeholder={t("media.stock.filters.orientation")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("media.stock.orientation.all")}
            </SelectItem>
            {ORIENTATIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`media.stock.orientation.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showColor ? (
          <Select
            value={color}
            disabled={refinementsDisabled}
            onValueChange={(value) => {
              onColorChange(value as StockColor | "all")
            }}
          >
            <SelectTrigger size="default" className="h-8 w-36" title={refinementHint}>
              <SelectValue placeholder={t("media.stock.filters.color")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("media.stock.color.all")}</SelectItem>
              {COLORS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`media.stock.color.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
    </div>
  )
}
