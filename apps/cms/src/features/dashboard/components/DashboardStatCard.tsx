import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

interface DashboardStatCardProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  to?: string
  className?: string
}

export function DashboardStatCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  className,
}: DashboardStatCardProps) {
  const content = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-secondary text-sm">{label}</p>
        <p className="text-primary mt-1 text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint ? <p className="text-secondary mt-1 text-xs">{hint}</p> : null}
      </div>
    </>
  )

  const cardClassName = cn(
    "border-secondary bg-panel flex items-start gap-4 rounded-xl border p-5 transition-colors",
    to && "hover:border-brand/40 hover:bg-panel/80",
    className
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
