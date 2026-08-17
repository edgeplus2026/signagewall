import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  title: string
  children: ReactNode
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-secondary text-[13px] font-medium">{title}</h2>
      <div className="divide-quaternary bg-panel divide-y overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--border-quaternary)]">
        {children}
      </div>
    </section>
  )
}

interface SettingsRowProps {
  label: ReactNode
  description?: string
  error?: string | undefined
  children?: ReactNode
  className?: string
  field?: boolean
}

export function SettingsRow({
  label,
  description,
  error,
  children,
  className,
  field = false,
}: SettingsRowProps) {
  return (
    // Stacked on a phone, side by side from `sm` up.
    //
    // The row used to be a single flex line at every width, with the control side
    // `shrink-0`. On a narrow screen that combination is unsurvivable: the control
    // refuses to give up a pixel, so the label column absorbs the whole shortfall
    // and collapses to about one word wide — "Kiosk lock" became a vertical column
    // of single letters while a long status string ran off the right edge. Nothing
    // was clipped, so it never looked like an overflow; it just looked broken.
    //
    // Every `shrink-0`/width below is therefore `sm:`-scoped, leaving the desktop
    // layout byte-for-byte what it was.
    <div
      className={cn(
        'flex flex-col items-start gap-2 px-4 py-3',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-8',
        className,
      )}
    >
      <div className="w-full min-w-0 sm:flex-1">
        <div className="text-primary flex min-w-0 items-center gap-2 text-sm">{label}</div>
        {description ? (
          <p className="text-secondary mt-1 text-[13px] leading-snug">{description}</p>
        ) : null}
      </div>
      {field ? (
        <div className="flex w-full flex-col gap-1 sm:w-56 sm:shrink-0">
          {children}
          {error ? <p className="text-danger text-xs">{error}</p> : null}
        </div>
      ) : children ? (
        // `flex-wrap` so a long status string wraps onto its own lines instead of
        // pushing the row wider than the panel.
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
          {children}
        </div>
      ) : null}
    </div>
  )
}
