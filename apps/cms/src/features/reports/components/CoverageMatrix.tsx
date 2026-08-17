import type { TFunction } from 'i18next'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import type { CoverageCell, CoverageRow } from '@/features/reports/types/reports.types'
import { cn } from '@/lib/utils'

const HOUR_LABELS = [0, 6, 12, 18, 23]

/**
 * A row per screen, a cell per hour, saturation for how much of that hour had
 * content on screen.
 *
 * The point of the shape: a gap does not have to be looked for, it interrupts a
 * band. A table of totals cannot do that — four items in one rotation always
 * play the same number of times, so a chart of plays is four bars of equal
 * length and tells you only what you already configured.
 */
export function CoverageMatrix({
  screens,
  focused = false,
}: {
  screens: CoverageRow[]
  /** True when the matrix is drawn for one item or campaign. */
  focused?: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className="border-secondary bg-panel overflow-x-auto rounded-lg border p-4 sm:p-5">
      <div className="min-w-[560px]">
        <div
          aria-hidden
          className="text-secondary mb-1.5 ml-[104px] flex justify-between pr-14 font-mono text-[10px] tabular-nums"
        >
          {HOUR_LABELS.map((hour) => (
            <span key={hour}>{String(hour).padStart(2, '0')}</span>
          ))}
        </div>

        {screens.map((screen) => (
          <div
            key={screen.screenId}
            className="mb-[3px] grid grid-cols-[96px_1fr_56px] items-center gap-x-2.5"
          >
            <span
              className="text-secondary truncate text-right text-[13px]"
              title={screen.name}
            >
              {screen.name}
            </span>

            <div className="grid h-[26px] grid-cols-24 gap-[2px]">
              {screen.cells.map((cell, hour) => (
                <span
                  key={hour}
                  className="block rounded-[2px]"
                  style={cellStyle(cell)}
                  title={cellTitle(t, cell, hour)}
                />
              ))}
            </div>

            <span
              className={cn(
                'text-right font-mono text-[12.5px] tabular-nums',
                // Focused, this column is the share of the day ONE item filled —
                // a few percent by design, on a perfectly healthy screen. Judging
                // it green or red would mark every row as a fault.
                focused || screen.coverage === null
                  ? 'text-secondary'
                  : screen.coverage >= 95
                    ? 'text-success'
                    : 'text-danger',
              )}
              title={
                focused
                  ? t('reports.focus.shareTitle')
                  : t('reports.coverage.label')
              }
            >
              {screen.coverage === null ? '—' : `${String(screen.coverage)}%`}
            </span>
          </div>
        ))}

        <Legend focused={focused} />
      </div>
    </div>
  )
}

function Legend({ focused }: { focused: boolean }) {
  const { t } = useTranslation()

  return (
    <div className="border-secondary text-secondary mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3.5 text-[12.5px]">
      <span className="inline-flex items-center gap-1.5">
        {[1, 2, 3, 4].map((level) => (
          <i key={level} className="size-3 rounded-[2px]" style={rampStyle(level)} />
        ))}
        {t('reports.legend.scale')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-3 rounded-[2px]" style={{ background: 'var(--coverage-idle)' }} />
        {t('reports.legend.idle')}
      </span>
      {focused ? (
        <span className="inline-flex items-center gap-1.5">
          <i className="size-3 rounded-[2px]" style={QUIET_STYLE} />
          {t('reports.legend.quiet')}
        </span>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-3 rounded-[2px]" style={OFF_STYLE} />
            {t('reports.legend.off')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-3 rounded-[2px]" style={STUCK_STYLE} />
            {t('reports.legend.stuck')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-3 rounded-[2px]" style={TAKEOVER_STYLE} />
            {t('reports.legend.takeover')}
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Unreachable and stuck are drawn as textures, not as steps on the ramp.
 *
 * They are not quantities, so giving them a shade would put them on the same
 * scale as "how full was this hour" and invite reading one as more of the other.
 * A texture also survives greyscale printing and colour blindness, which a
 * fourth and fifth colour would not.
 */
const OFF_STYLE: CSSProperties = {
  background:
    'repeating-linear-gradient(45deg, transparent 0 3px, var(--danger) 3px 4px), color-mix(in srgb, var(--danger) 12%, transparent)',
}

/**
 * Expected to be on, but this particular item did not run.
 *
 * Only ever seen in a focused view, and deliberately neutral: the screen was
 * working, it was simply showing the rest of the rotation. Reusing the red hatch
 * here would turn "my spot runs every fourth slot" into a wall of alarm.
 */
const QUIET_STYLE: CSSProperties = {
  background:
    'repeating-linear-gradient(45deg, transparent 0 2px, color-mix(in srgb, var(--text-secondary) 20%, transparent) 2px 3px), var(--coverage-idle)',
}

/**
 * An emergency notice held the screen.
 *
 * Vertical rather than the diagonal of an outage or the horizontal of a stuck
 * rotation, and in the informational colour rather than a warning one: the
 * screen was working and showing exactly what it was told to. It is drawn apart
 * from ordinary content because "an hour of evacuation notice" and "an hour of
 * rotation" are not the same answer to what was on this screen — which is the
 * whole reason a takeover is recorded at all.
 */
const TAKEOVER_STYLE: CSSProperties = {
  background:
    'repeating-linear-gradient(90deg, transparent 0 3px, var(--info) 3px 4px), color-mix(in srgb, var(--info) 12%, transparent)',
}

const STUCK_STYLE: CSSProperties = {
  background:
    'repeating-linear-gradient(0deg, transparent 0 3px, var(--warning) 3px 4px), color-mix(in srgb, var(--warning) 12%, transparent)',
}

function rampStyle(level: number): CSSProperties {
  return { background: `var(--coverage-${String(level)})` }
}

function cellStyle(cell: CoverageCell): CSSProperties {
  switch (cell.state) {
    case 'off':
      return OFF_STYLE
    case 'stuck':
      return STUCK_STYLE
    case 'quiet':
      return QUIET_STYLE
    case 'takeover':
      return TAKEOVER_STYLE
    case 'covered':
      return rampStyle(cell.level)
    default:
      return { background: 'var(--coverage-idle)' }
  }
}

/** The cell's own explanation, for the reader who stops on one. */
function cellTitle(
  t: TFunction,
  cell: CoverageCell,
  hour: number,
): string {
  const clock = `${String(hour).padStart(2, '0')}:00`
  if (cell.state === 'idle') {
    return `${clock} · ${t('reports.legend.idle')}`
  }
  if (cell.state === 'off') {
    return `${clock} · ${t('reports.legend.off')}`
  }
  if (cell.state === 'stuck') {
    return `${clock} · ${t('reports.legend.stuck')}`
  }
  if (cell.state === 'quiet') {
    return `${clock} · ${t('reports.legend.quiet')}`
  }
  if (cell.state === 'takeover') {
    return `${clock} · ${t('reports.legend.takeover')}`
  }
  return `${clock} · ${t('reports.cell.covered', {
    percent: Math.round((cell.coveredMs / Math.max(1, cell.expectedMs)) * 100),
    plays: cell.plays,
  })}`
}
