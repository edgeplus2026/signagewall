import { ArrowDown, ArrowUp, Crosshair } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PlaybackItemsReport } from '@/features/reports/types/reports.types'
import { cn } from '@/lib/utils'

type SortKey = 'name' | 'plays' | 'airtimeMs' | 'share' | 'screens'

/**
 * The table is the deliverable.
 *
 * What an advertiser reads is numbers, not bars — and the column their own
 * question lands on is the last one: which screens ran it. A client with two
 * locations asks that immediately, and a report that only sums across the whole
 * account cannot answer it.
 */
export function PlaybackItemsTable({
  report,
  onFocus,
}: {
  report: PlaybackItemsReport
  /** Opens the matrix for one item — "where and when did MY spot run". */
  onFocus: (focus: { contentId: string; name: string }) => void
}) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: 'airtimeMs',
    desc: true,
  })

  const rows = useMemo(() => {
    const sorted = [...report.items]
    sorted.sort((a, b) => {
      const factor = sort.desc ? -1 : 1
      if (sort.key === 'name') {
        return a.name.localeCompare(b.name) * factor
      }
      return (a[sort.key] - b[sort.key]) * factor
    })
    return sorted
  }, [report.items, sort])

  const toggle = (key: SortKey): void => {
    setSort((current) =>
      current.key === key
        ? { key, desc: !current.desc }
        : { key, desc: key !== 'name' },
    )
  }

  const column = (key: SortKey, label: string, numeric = true) => (
    <TableHead className={numeric ? 'text-right' : undefined}>
      <button
        type="button"
        onClick={() => {
          toggle(key)
        }}
        className={cn(
          'text-secondary hover:text-primary inline-flex items-center gap-1 text-xs',
          numeric && 'flex-row-reverse',
        )}
      >
        {label}
        {sort.key === key &&
          (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </button>
    </TableHead>
  )

  return (
    <div className="border-secondary bg-panel overflow-x-auto rounded-lg border">
      {/* Totals live here rather than in headline cards: they are what the
          advertiser looks up while reading the rows, not the story of the page. */}
      <div className="border-secondary text-secondary flex flex-wrap gap-x-6 gap-y-1 border-b px-4 py-3 text-sm">
        <span>
          {t('reports.table.totalPlays')}{' '}
          <span className="text-primary font-mono tabular-nums">
            {report.totals.plays.toLocaleString()}
          </span>
        </span>
        <span>
          {t('reports.table.totalAirtime')}{' '}
          <span className="text-primary font-mono tabular-nums">
            {formatDuration(report.totals.airtimeMs)}
          </span>
        </span>
        {report.truncated && (
          <span className="text-warning">{t('reports.table.truncated')}</span>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {column('name', t('reports.table.item'), false)}
            {column('plays', t('reports.table.plays'))}
            {column('airtimeMs', t('reports.table.airtime'))}
            {column('share', t('reports.table.share'))}
            {column('screens', t('reports.table.screens'))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-secondary py-8 text-center text-sm">
                {t('reports.table.empty')}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((item) => (
              <TableRow key={item.contentId}>
                <TableCell className="max-w-[18rem]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title={t('reports.table.focus')}
                      onClick={() => {
                        onFocus({ contentId: item.contentId, name: item.name })
                      }}
                      className="text-secondary hover:text-primary shrink-0"
                    >
                      <Crosshair className="size-3.5" />
                    </button>
                    <span className="truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {item.plays.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatDuration(item.airtimeMs)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {item.share.toFixed(1)}%
                </TableCell>
                <TableCell
                  className="text-right font-mono tabular-nums"
                  title={item.screenNames.join(', ')}
                >
                  {item.screens}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/** Measured airtime as h:mm — the unit the report is actually about. */
function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  return `${String(hours)}:${String(minutes % 60).padStart(2, '0')}`
}
