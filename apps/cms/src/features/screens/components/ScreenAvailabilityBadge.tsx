import { Moon, Power } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ScreenAvailabilityStatus } from '@/features/screens/types/screen.types'
import { cn } from '@/lib/utils'

interface ScreenAvailabilityBadgeProps {
  status: ScreenAvailabilityStatus | undefined
  className?: string
}

/** Formats an instant as a short weekday + time in the screen's own timezone. */
function formatBoundary(iso: string, timezone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString(locale)
  }
}

/**
 * Whether the screen is currently within its working hours (playing) or in
 * scheduled standby (dark). Distinct from {@link ScreenPresenceBadge}, which is
 * about device connectivity — a screen can be online but in standby. The tooltip
 * explains the state and, when scheduled, when it next flips.
 */
export function ScreenAvailabilityBadge({
  status,
  className,
}: ScreenAvailabilityBadgeProps) {
  const { t, i18n } = useTranslation()

  if (!status) {
    return null
  }

  const { isOn, timezone, nextTransition } = status
  const label = isOn
    ? t('screens.availability.statusBadge.on')
    : t('screens.availability.statusBadge.off')

  let description: string
  if (nextTransition) {
    const when = formatBoundary(nextTransition.at, timezone, i18n.language)
    description = isOn
      ? t('screens.availability.statusBadge.onUntil', { time: when })
      : t('screens.availability.statusBadge.offUntil', { time: when })
  } else {
    description = isOn
      ? t('screens.availability.statusBadge.alwaysOn')
      : t('screens.availability.statusBadge.offIndefinite')
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md bg-sidebar px-2 py-0.5 text-xs font-medium',
              isOn ? 'text-success' : 'text-secondary',
              className,
            )}
          >
            {isOn ? (
              <Power className="size-3 shrink-0" />
            ) : (
              <Moon className="size-3 shrink-0" />
            )}
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
