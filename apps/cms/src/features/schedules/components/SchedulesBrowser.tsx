import { CalendarClock, MoreVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import type { ScheduleSummary } from '@/features/schedules/types/schedule.types'

interface SchedulesBrowserProps {
  schedules: ScheduleSummary[]
  isLoading: boolean
  onDelete: (schedule: ScheduleSummary) => void
}

export function SchedulesBrowser({
  schedules,
  isLoading,
  onDelete,
}: SchedulesBrowserProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="group border-secondary bg-panel relative flex flex-col gap-3 rounded-xl border p-4"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                aria-label={t('common.actions')}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="danger"
                onClick={() => {
                  onDelete(schedule)
                }}
              >
                {t('schedules.delete.action')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to={`/schedules/${schedule.id}`} className="flex flex-col gap-3">
            <span className="bg-highlight text-brand flex size-10 items-center justify-center rounded-lg">
              <CalendarClock className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-primary truncate text-sm font-medium">
                {schedule.name}
              </span>
              <span className="text-secondary text-xs">
                {t('schedules.card.eventCount', { count: schedule.eventCount })} ·{' '}
                {t('schedules.card.screenCount', {
                  count: schedule.assignedScreenCount,
                })}
              </span>
            </div>
          </Link>
        </div>
      ))}
    </div>
  )
}
