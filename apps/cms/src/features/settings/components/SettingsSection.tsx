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
    <div
      className={cn(
        'flex justify-between gap-8 px-4 py-3 items-center',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-primary flex min-w-0 items-center gap-2 text-sm">{label}</div>
        {description ? (
          <p className="text-secondary mt-1 text-[13px] leading-snug">{description}</p>
        ) : null}
      </div>
      {field ? (
        <div className="flex w-56 shrink-0 flex-col gap-1">
          {children}
          {error ? <p className="text-danger text-xs">{error}</p> : null}
        </div>
      ) : children ? (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </div>
  )
}
