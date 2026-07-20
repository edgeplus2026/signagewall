import type { LucideIcon } from 'lucide-react'
import { TrendingUpIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Sparkline } from '@/features/dashboard/components/Sparkline'
import { cn } from '@/lib/utils'

interface DashboardStatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  to?: string
  /** Count added in the recent window; renders a "+N" trend pill when positive. */
  delta?: number
  deltaLabel?: string
  /** Weekly cumulative series for the mini sparkline. */
  spark?: number[]
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
  spark,
  live,
  className,
}: DashboardStatCardProps) {
  const showSpark = spark && spark.length > 1 && Math.max(...spark) > Math.min(...spark)

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="bg-brand/10 text-brand flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105">
          <Icon className="size-5" />
        </div>

        {live ? (
          <span className="text-success bg-success/10 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium">
            <span className="relative flex size-1.5">
              <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-success relative inline-flex size-1.5 rounded-full" />
            </span>
            Live
          </span>
        ) : delta && delta > 0 ? (
          <span className="text-success bg-success/10 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums">
            <TrendingUpIcon className="size-3" />+{delta}
            {deltaLabel ? <span className="text-success/70 font-normal">{deltaLabel}</span> : null}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="text-primary text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="text-secondary mt-1 text-sm">{label}</p>
      </div>

      {showSpark ? (
        <div className="text-brand/70 -mx-1 mt-auto pt-1">
          <Sparkline data={spark} />
        </div>
      ) : null}
    </>
  )

  const cardClassName = cn(
    'group border-secondary bg-panel relative flex min-h-38 flex-col gap-4 overflow-hidden rounded-xl border p-5 transition-all duration-200',
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
