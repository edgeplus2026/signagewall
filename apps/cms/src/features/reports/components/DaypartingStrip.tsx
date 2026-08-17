import { useTranslation } from 'react-i18next'

import type { DaypartingReport } from '@/features/reports/types/reports.types'

/**
 * Plays by hour of day, over the whole range.
 *
 * Drawn as one strip in the same ramp and the same 24 columns as the coverage
 * matrix, deliberately: it is the same axis asking a different question, and
 * giving it a chart language of its own would make the page read as two
 * unrelated dashboards. Height is fixed — the quantity is in the shade, not in a
 * bar, so the strip stays legible when one lunchtime hour dwarfs the rest.
 */
export function DaypartingStrip({ report }: { report: DaypartingReport }) {
  const { t } = useTranslation()
  const peak = Math.max(1, ...report.plays)
  const total = report.plays.reduce((sum, plays) => sum + plays, 0)

  return (
    <div className="border-secondary bg-panel overflow-x-auto rounded-lg border p-4 sm:p-5">
      <div className="min-w-[560px]">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-secondary text-xs tracking-wide uppercase">
            {t('reports.dayparting.heading')}
          </span>
          <span className="text-secondary font-mono text-xs tabular-nums">
            {t('reports.dayparting.total', { count: total })}
          </span>
        </div>

        <div className="grid grid-cols-24 gap-[2px]">
          {report.plays.map((plays, hour) => (
            <span
              key={hour}
              className="block h-[26px] rounded-[2px]"
              style={{
                background:
                  plays === 0
                    ? 'var(--coverage-idle)'
                    : `var(--coverage-${String(Math.min(4, Math.max(1, Math.ceil((plays / peak) * 4))))})`,
              }}
              title={t('reports.dayparting.cell', {
                hour: `${String(hour).padStart(2, '0')}:00`,
                plays,
                minutes: Math.round((report.airtimeMs[hour] ?? 0) / 60_000),
              })}
            />
          ))}
        </div>

        <div
          aria-hidden
          className="text-secondary mt-1.5 flex justify-between font-mono text-[10px] tabular-nums"
        >
          {[0, 6, 12, 18, 23].map((hour) => (
            <span key={hour}>{String(hour).padStart(2, '0')}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
