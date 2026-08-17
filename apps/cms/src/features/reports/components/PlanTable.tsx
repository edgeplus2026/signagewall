import { useTranslation } from 'react-i18next'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PlanReport } from '@/features/reports/types/reports.types'
import { cn } from '@/lib/utils'

/** A shortfall smaller than this is rounding, not a fault. */
const TOLERANCE = 0.05

/**
 * What the rotation had time for, next to what actually ran.
 *
 * The coverage matrix says WHEN a screen was empty; this says WHICH item came up
 * short — a clip that failed to load is skipped silently by the player, so the
 * screen looks busy all day while one item quietly never appears. That is
 * invisible in every other view on this page.
 */
export function PlanTable({ report }: { report: PlanReport }) {
  const { t } = useTranslation()
  const shortfalls = report.rows.filter(
    (row) => row.ratio !== null && row.ratio < (1 - TOLERANCE) * 100,
  )

  return (
    <div className="border-secondary bg-panel overflow-x-auto rounded-lg border">
      <div className="border-secondary text-secondary flex flex-wrap gap-x-6 gap-y-1 border-b px-4 py-3 text-sm">
        <span>
          {shortfalls.length === 0
            ? t('reports.plan.allOnPlan')
            : t('reports.plan.shortfalls', { count: shortfalls.length })}
        </span>
        {/* Said plainly: the plan is read from the rotation as it stands now,
            because nothing records what it was on the reported day. */}
        <span className="text-xs">{t('reports.plan.basis')}</span>
        {report.truncated && (
          <span className="text-warning text-xs">
            {t('reports.plan.truncated')}
          </span>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('reports.plan.screen')}</TableHead>
            <TableHead>{t('reports.plan.item')}</TableHead>
            <TableHead className="text-right">
              {t('reports.plan.planned')}
            </TableHead>
            <TableHead className="text-right">
              {t('reports.plan.actual')}
            </TableHead>
            <TableHead className="text-right">
              {t('reports.plan.delta')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-secondary py-8 text-center text-sm"
              >
                {t('reports.plan.empty')}
              </TableCell>
            </TableRow>
          ) : (
            report.rows.map((row) => (
              <TableRow key={`${row.screenId}-${row.contentId}`}>
                <TableCell
                  className="text-secondary max-w-[10rem] truncate"
                  title={row.screenName}
                >
                  {row.screenName}
                </TableCell>
                <TableCell className="max-w-[16rem] truncate" title={row.name}>
                  {row.name}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.plannedPlays.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.actualPlays.toLocaleString()}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono tabular-nums',
                    row.ratio !== null && row.ratio < (1 - TOLERANCE) * 100
                      ? 'text-danger'
                      : 'text-secondary',
                  )}
                >
                  {row.delta > 0 ? `+${String(row.delta)}` : row.delta}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
