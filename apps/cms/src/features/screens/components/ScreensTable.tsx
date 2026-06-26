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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScreenPresenceBadge } from "@/features/screens/components/ScreenPresenceBadge"
import { useScreenPresence } from "@/features/screens/providers/presenceContext"
import type {
  ScreenManageTab,
  ScreenSummary,
} from "@/features/screens/types/screen.types"

interface ScreensTableProps {
  screens: ScreenSummary[]
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onOpen: (screen: ScreenSummary, tab: ScreenManageTab) => void
  onDelete: (ids: string[]) => void
}

export function ScreensTable({
  screens,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpen,
  onDelete,
}: ScreensTableProps) {
  const { t } = useTranslation()
  const allSelected =
    screens.length > 0 && screens.every((screen) => selectedIds.has(screen.id))
  const someSelected = screens.some((screen) => selectedIds.has(screen.id))

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-secondary">
      <Table
        containerClassName="overflow-visible"
        className="w-full min-w-[42rem] table-fixed"
      >
        <colgroup>
          <col style={{ width: "50px" }} />
          <col style={{ width: "55%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "50px" }} />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => {
                  onSelectAll(checked === true)
                }}
                aria-label={t("screens.selectAll")}
              />
            </TableHead>
            <TableHead>{t("screens.columns.name")}</TableHead>
            <TableHead>{t("screens.columns.items")}</TableHead>
            <TableHead>{t("screens.columns.updatedAt")}</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">{t("common.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {screens.map((screen) => (
            <ScreenTableRow
              key={screen.id}
              screen={screen}
              isSelected={selectedIds.has(screen.id)}
              onSelect={onSelect}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface ScreenTableRowProps {
  screen: ScreenSummary
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onOpen: (screen: ScreenSummary, tab: ScreenManageTab) => void
  onDelete: (ids: string[]) => void
}

function ScreenTableRow({
  screen,
  isSelected,
  onSelect,
  onOpen,
  onDelete,
}: ScreenTableRowProps) {
  const { t, i18n } = useTranslation()
  const presence = useScreenPresence(screen.id)

  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className="cursor-pointer"
      onClick={() => {
        onOpen(screen, "content")
      }}
    >
      <TableCell onClick={(event) => { event.stopPropagation() }}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => {
            onSelect(screen.id, checked === true)
          }}
          aria-label={t("screens.selectItem", { name: screen.name })}
        />
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-secondary bg-sidebar">
            <MonitorIcon className="size-5 text-secondary" />
          </div>
          <span className="min-w-0 truncate font-medium" title={screen.name}>
            {screen.name}
          </span>
          <ScreenPresenceBadge device={presence} compact className="shrink-0" />
        </div>
      </TableCell>
      <TableCell className="text-secondary">
        {t("screens.content.itemCount", { count: screen.itemCount })}
      </TableCell>
      <TableCell className="text-secondary">
        {new Date(screen.updatedAt).toLocaleDateString(i18n.language, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </TableCell>
      <TableCell onClick={(event) => { event.stopPropagation() }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm">
              <MoreHorizontalIcon />
              <span className="sr-only">{t("common.actions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuItem
              onClick={() => {
                onOpen(screen, "content")
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
                onDelete([screen.id])
              }}
            >
              <Trash2Icon />
              {t("screens.actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
