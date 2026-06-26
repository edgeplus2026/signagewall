import { useTranslation } from 'react-i18next'

import type { ScreenDevice } from '@/features/screens/types/screen.types'
import { cn } from '@/lib/utils'

interface ScreenPresenceBadgeProps {
  device: ScreenDevice | undefined
  /** Compact dot-only variant for dense lists/cards. */
  compact?: boolean
  className?: string
}

/**
 * Live online/offline indicator for a screen's bound display. A pulsing dot
 * (icon) plus a label, driven by realtime presence. Always renders — a screen
 * with no paired/connected device reads as "offline", which is itself a useful
 * signal at a glance.
 */
export function ScreenPresenceBadge({
  device,
  compact = false,
  className,
}: ScreenPresenceBadgeProps) {
  const { t } = useTranslation()

  const online = device?.online === true
  const label = online ? t('screens.device.online') : t('screens.device.offline')

  const dot = (
    <span className="relative flex size-2 shrink-0">
      {online ? (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
      ) : null}
      <span
        className={cn(
          'relative inline-flex size-2 rounded-full',
          online ? 'bg-success' : 'bg-danger',
        )}
      />
    </span>
  )

  if (compact) {
    return (
      <span className={cn('inline-flex items-center', className)} title={label}>
        {dot}
        <span className="sr-only">{label}</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-sidebar px-2 py-0.5 text-xs font-medium',
        online ? 'text-success' : 'text-danger',
        className,
      )}
    >
      {dot}
      {label}
    </span>
  )
}
