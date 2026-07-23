import {
  EyeIcon,
  FolderInputIcon,
  ListPlusIcon,
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
import { MediaThumbnail } from "@/features/media/components/MediaThumbnail"
import {
  formatDimensions,
  formatFileSize,
} from "@/features/media/lib/mediaUtils"
import type { MediaItem } from "@/features/media/types/media.types"
import { cn } from "@/lib/utils"

interface MediaTableProps {
  items: MediaItem[]
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onOpenItem: (item: MediaItem) => void
  onRename: (item: MediaItem) => void
  onMove: (ids: string[]) => void
  onDelete: (ids: string[]) => void
  onAddToPlaylist: (ids: string[]) => void
  onAddToScreen: (ids: string[]) => void
}

export function MediaTable({
  items,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpenItem,
  onRename,
  onMove,
  onDelete,
  onAddToPlaylist,
  onAddToScreen,
}: MediaTableProps) {
  const { t, i18n } = useTranslation()
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id))
  const someSelected = items.some((item) => selectedIds.has(item.id))

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-secondary">
      <Table
        containerClassName="overflow-visible"
        className="w-full min-w-[42rem] table-fixed"
      >
        <colgroup>
          <col style={{ width: "50px" }} />
          <col style={{ width: "45%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "16%" }} />
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
                aria-label={t("media.selectAll")}
              />
            </TableHead>
            <TableHead>{t("media.table.name")}</TableHead>
            <TableHead>{t("media.table.type")}</TableHead>
            <TableHead>{t("media.table.size")}</TableHead>
            <TableHead>{t("media.table.dimensions")}</TableHead>
            <TableHead>{t("media.table.uploadedAt")}</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">{t("common.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id)

            return (
              <TableRow
                key={item.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => {
                  onOpenItem(item)
                }}
              >
                <TableCell onClick={(event) => { event.stopPropagation(); }}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      onSelect(item.id, checked === true)
                    }}
                    aria-label={t("media.selectItem", { name: item.name })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-10 shrink-0 overflow-hidden rounded-md border border-secondary">
                      <MediaThumbnail item={item} iconClassName="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={item.name}>
                        {item.name}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                      item.type === "image"
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success",
                    )}
                  >
                    {t(`media.types.${item.type}`)}
                  </span>
                </TableCell>
                <TableCell>{formatFileSize(item.size)}</TableCell>
                <TableCell>{formatDimensions(item.width, item.height)}</TableCell>
                <TableCell>
                  {new Date(item.createdAt).toLocaleDateString(i18n.language, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell onClick={(event) => { event.stopPropagation(); }}>
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
                          onOpenItem(item)
                        }}
                      >
                        <EyeIcon />
                        {t("media.actions.view")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          onRename(item)
                        }}
                      >
                        <PencilIcon />
                        {t("media.actions.rename")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          onMove([item.id])
                        }}
                      >
                        <FolderInputIcon />
                        {t("media.actions.move")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          onAddToPlaylist([item.id])
                        }}
                      >
                        <ListPlusIcon />
                        {t("media.actions.addToPlaylist")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          onAddToScreen([item.id])
                        }}
                      >
                        <MonitorIcon />
                        {t("media.actions.addToScreen")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="danger"
                        onClick={() => {
                          onDelete([item.id])
                        }}
                      >
                        <Trash2Icon />
                        {t("media.actions.moveToTrash")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
