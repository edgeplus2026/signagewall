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
 * OTA states an operator must act on. A device that failed or rolled back an
 * update keeps serving the old shell — so it still reports a perfectly green
 * "online" dot. Without a second signal here, a bad rollout is invisible from
 * the screens list and only findable by opening all 500 device tabs.
 */
const ATTENTION_RESULTS = new Set(['error', 'unhealthy'])

/**
 * Live online/offline indicator for a screen's bound display. A pulsing dot
 * (icon) plus a label, driven by realtime presence. Always renders — a screen
 * with no paired/connected device reads as "offline", which is itself a useful
 * signal at a glance. When the device's last OTA outcome needs attention, a
 * second amber dot rides along so a failed rollout is visible fleet-wide.
 */
export function ScreenPresenceBadge({
  device,
  compact = false,
  className,
}: ScreenPresenceBadgeProps) {
  const { t } = useTranslation()

  const online = device?.online === true
  const label = online ? t('screens.device.online') : t('screens.device.offline')

  const updateResult = device?.profile?.updateStatus?.lastResult
  const needsAttention = updateResult
    ? ATTENTION_RESULTS.has(updateResult)
    : false
  const updateLabel = updateResult
    ? t(`screens.device.updateResult.${updateResult}`, {
        defaultValue: updateResult,
      })
    : undefined

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

  const updateDot = needsAttention ? (
    <span
      className="inline-flex size-2 shrink-0 rounded-full bg-warning"
      title={updateLabel}
    >
      <span className="sr-only">{updateLabel}</span>
    </span>
  ) : null

  if (compact) {
    return (
      <span
        className={cn('inline-flex items-center gap-1', className)}
        title={updateLabel ? `${label} · ${updateLabel}` : label}
      >
        {dot}
        <span className="sr-only">{label}</span>
        {updateDot}
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
      {updateDot}
    </span>
  )
}
