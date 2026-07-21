import type { LucideIcon } from 'lucide-react'
import { TrendingUpIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

interface DashboardStatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  to?: string
  /** Count added in the recent window; renders a "+N" trend pill when positive. */
  delta?: number
  deltaLabel?: string
  /** Renders a pulsing "live" dot instead of a delta pill (used by the online card). */
  live?: boolean
  className?: string
}

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  to,
  delta,
  deltaLabel,
  live,
  className,
}: DashboardStatCardProps) {
  const content = (
    <>
      <div className="bg-brand/10 text-brand flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105">
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-primary text-2xl leading-none font-semibold tracking-tight tabular-nums">
            {value}
          </p>

          {live ? (
            <span className="text-success bg-success/10 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium">
              <span className="relative flex size-1.5">
                <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                <span className="bg-success relative inline-flex size-1.5 rounded-full" />
              </span>
              Live
            </span>
          ) : delta && delta > 0 ? (
            <span className="text-success bg-success/10 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums">
              <TrendingUpIcon className="size-3" />+{delta}
              {deltaLabel ? (
                <span className="text-success/70 font-normal">{deltaLabel}</span>
              ) : null}
            </span>
          ) : null}
        </div>

        <p className="text-secondary mt-1.5 truncate text-sm">{label}</p>
      </div>
    </>
  )

  const cardClassName = cn(
    'group border-secondary bg-panel flex items-center gap-4 rounded-xl border p-4 transition-all duration-200',
    to && 'hover:border-brand/40 hover:shadow-sm',
    className,
  )

  if (to) {
    return (
      <Link to={to} className={cardClassName}>
        {content}
      </Link>
    )
  }

  return <div className={cardClassName}>{content}</div>
}
