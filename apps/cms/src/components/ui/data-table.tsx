import {
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { cn } from "@/lib/utils"

interface DataTableColumnMeta {
  align?: "left" | "right"
  width?: string
}

interface DataTablePagination {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

interface DataTableServerSide {
  search: string
  onSearchChange: (value: string) => void
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  emptyMessage?: string
  toolbar?: React.ReactNode
  onRowClick?: (row: TData) => void
  pagination?: DataTablePagination
  serverSide?: DataTableServerSide
  isLoading?: boolean
}

function getColumnMeta(meta: unknown) {
  return meta as DataTableColumnMeta | undefined
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  emptyMessage,
  toolbar,
  onRowClick,
  pagination,
  serverSide,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation()
  const [clientSorting, setClientSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [clientGlobalFilter, setClientGlobalFilter] = useState("")

  const sorting = serverSide?.sorting ?? clientSorting
  const globalFilter = serverSide?.search ?? clientGlobalFilter

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns unstable function refs by design
  const table = useReactTable({
    data,
    columns,
    state: serverSide
      ? { sorting, columnFilters }
      : { sorting, columnFilters, globalFilter },
    onSortingChange: serverSide?.onSortingChange ?? setClientSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    ...(serverSide
      ? { manualSorting: true, manualFiltering: true }
      : {
          onGlobalFilterChange: setClientGlobalFilter,
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          globalFilterFn: "includesString",
        }),
  })

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={globalFilter}
          onChange={(event) => {
            const value = event.target.value
            if (serverSide) {
              serverSide.onSearchChange(value)
            } else {
              setClientGlobalFilter(value)
            }
          }}
          placeholder={searchPlaceholder ?? t("dataTable.search")}
          className="h-8 w-full max-w-xs"
        />
        {toolbar ? <div className="w-fit shrink-0">{toolbar}</div> : null}
      </div>

      <div
        className={cn(
          "min-w-0 overflow-x-auto rounded-xl border border-secondary bg-panel transition-opacity",
          isLoading && "pointer-events-none opacity-60",
        )}
      >
        <Table
          containerClassName="overflow-visible"
          className="w-full min-w-[42rem] table-fixed"
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((column) => {
              const width = getColumnMeta(column.columnDef.meta)?.width

              return (
                <col
                  key={column.id}
                  style={width ? { width } : undefined}
                />
              )
            })}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  const align = getColumnMeta(header.column.columnDef.meta)?.align

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(align === "right" && "text-right")}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 gap-1.5 px-2 font-medium text-secondary hover:text-primary"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sorted === "asc" ? (
                            <ArrowUpIcon className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon className="size-3.5" />
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 opacity-50" />
                          )}
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={
                    onRowClick
                      ? () => {
                          onRowClick(row.original)
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = getColumnMeta(cell.column.columnDef.meta)?.align

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "min-w-0",
                          align === "right" && "text-right"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center text-secondary"
                >
                  {emptyMessage ?? t("dataTable.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <TablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
        />
      ) : null}
    </div>
  )
}
