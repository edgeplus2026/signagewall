import { formatDistanceToNowStrict } from 'date-fns'
import { srLatn } from 'date-fns/locale'
import { MonitorIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import type { FleetScreen } from '@/features/dashboard/hooks/useDashboardData'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/utils'

interface FleetHealthProps {
  fleet: FleetScreen[]
}

/** Rows shown before the panel defers to the "view all" link. */
const MAX_ROWS = 6

/**
 * Problem-first fleet overview: dead paired displays (longest down first),
 * then screens still waiting for a device, then the healthy rest. Signage is
 * judged on screens that quietly die — this panel is where an operator sees
 * it, mirroring the offline alert emails.
 */
export function FleetHealth({ fleet }: FleetHealthProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('sr') ? srLatn : undefined
  // Presence pushes arrive over the socket, but a screen that simply STAYS
  // offline produces no event — without a ticker its "offline for X" freezes.
  const now = useNow(30_000)

  if (fleet.length === 0) {
    return (
      <Empty className="min-h-50 flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MonitorIcon />
          </EmptyMedia>
          <EmptyTitle>{t('dashboard.fleet.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('dashboard.fleet.empty')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/screens">{t('dashboard.fleet.setup')}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const statusLabel = (screen: FleetScreen): string => {
    if (!screen.paired) {
      return t('dashboard.fleet.notPaired')
    }
    if (screen.online) {
      return t('dashboard.fleet.online')
    }
    if (screen.lastSeenAt) {
      const lastSeen = new Date(screen.lastSeenAt).getTime()
      if (Number.isNaN(lastSeen)) {
        return t('dashboard.fleet.offline')
      }
      // Clamp to now: a device whose clock runs ahead reports a future
      // `lastSeenAt`, and date-fns would render that as "in 4 hours" on a row
      // labelled offline.
      return t('dashboard.fleet.offlineFor', {
        duration: formatDistanceToNowStrict(new Date(Math.min(lastSeen, now)), {
          ...(locale ? { locale } : {}),
        }),
      })
    }
    return t('dashboard.fleet.offline')
  }

  return (
    <ul className="flex flex-col">
      {fleet.slice(0, MAX_ROWS).map((screen) => {
        const details = [screen.platform, screen.appVersion]
          .filter(Boolean)
          .join(' · ')
        return (
          <li key={screen.id}>
            <Link
              to={`/screens/${screen.id}?tab=device`}
              className="hover:bg-secondary/40 -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
            >
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  screen.paired && screen.online && 'bg-emerald-500',
                  screen.paired && !screen.online && 'bg-red-500',
                  !screen.paired && 'bg-muted-foreground/40',
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="text-primary block truncate text-sm">
                  {screen.name}
                </span>
                {details ? (
                  <span className="text-secondary block truncate text-xs">
                    {details}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'shrink-0 text-xs',
                  screen.paired && !screen.online
                    ? 'font-medium text-red-500'
                    : 'text-secondary',
                )}
              >
                {statusLabel(screen)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
