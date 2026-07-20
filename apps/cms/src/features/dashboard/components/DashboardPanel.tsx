import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface DashboardPanelProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

/** Framed, titled surface used for the dashboard's charts and lists. */
export function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: DashboardPanelProps) {
  return (
    <section
      className={cn('border-secondary bg-panel flex min-w-0 flex-col rounded-xl border', className)}
    >
      <header className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <h2 className="text-primary text-sm font-medium">{title}</h2>
          {description ? <p className="text-secondary mt-0.5 text-xs">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn('flex min-w-0 flex-1 flex-col px-5 pb-5', contentClassName)}>
        {children}
      </div>
    </section>
  )
}
