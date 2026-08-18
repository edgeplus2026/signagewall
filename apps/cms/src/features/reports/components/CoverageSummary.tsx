import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import type { CoverageException } from '@/features/reports/types/reports.types'
import { cn } from '@/lib/utils'

/**
 * One number, and the sentences behind it.
 *
 * Deliberately not three big cards with icons: total plays and total airtime do
 * not vary — a rotation plays every item the same number of times — so putting
 * them in headline tiles gives the most prominent position on the page to the
 * two numbers nobody can act on. They belong in the table header, where an
 * advertiser looks for them. What varies, and what somebody is accountable for,
 * is how much of the expected time actually had content.
 */
export function CoverageSummary({
  coverage,
  screens,
  exceptions,
}: {
  coverage: number | null
  screens: number
  exceptions: CoverageException[]
}) {
  const { t } = useTranslation()

  return (
    <div className="border-secondary bg-panel rounded-lg border p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-secondary text-xs tracking-wide uppercase">
          {t('reports.coverage.label')}
        </span>
        <span
          className={cn(
            'font-mono text-3xl tabular-nums',
            coverage === null
              ? 'text-secondary'
              : coverage >= 95
                ? 'text-success'
                : 'text-danger',
          )}
        >
          {coverage === null ? '—' : `${String(coverage)}%`}
        </span>
        <span className="text-secondary text-sm">
          {t('reports.coverage.screens', { count: screens })}
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {exceptions.length === 0 ? (
          <li className="text-secondary text-sm">
            {t('reports.exceptions.none')}
          </li>
        ) : (
          exceptions.map((exception) => (
            <li
              key={`${exception.screenId}-${exception.kind}-${String(exception.fromHour)}`}
              className="grid grid-cols-[minmax(0,7rem)_1fr] items-baseline gap-x-3 text-sm sm:grid-cols-[minmax(0,9rem)_1fr_auto]"
            >
              <span className="text-primary truncate" title={exception.screenName}>
                {exception.screenName}
              </span>
              <span className="text-secondary">
                {t(`reports.exceptions.${exception.kind}`, {
                  item: exception.itemName ?? '—',
                  duration: humanDuration(t, exception.durationMs),
                })}
              </span>
              <span className="text-secondary col-span-2 font-mono text-xs tabular-nums sm:col-span-1">
                {clock(exception.fromHour)} → {clock(exception.toHour)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

/**
 * An hour-of-day boundary as a clock time.
 *
 * `toHour` is exclusive and reaches 24 for a run that lasts to the end of the
 * day, which has to print as `24:00`. Wrapping it with `% 24` turned every
 * all-day outage into `00:00 → 00:00` — a zero-length interval, on the one row
 * that was supposed to say the screen was dark all day.
 */
function clock(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/** '4 h 3 min', in the reader's language. */
function humanDuration(
  t: TFunction,
  ms: number,
): string {
  const minutes = Math.round(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return t('reports.duration.minutes', { count: rest })
  }
  if (rest === 0) {
    return t('reports.duration.hours', { count: hours })
  }
  return t('reports.duration.hoursMinutes', { hours, minutes: rest })
}
