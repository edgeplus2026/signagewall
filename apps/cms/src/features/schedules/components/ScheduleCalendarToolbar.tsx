import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CalendarViewName = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'

const VIEW_OPTIONS: CalendarViewName[] = [
  'timeGridDay',
  'timeGridWeek',
  'dayGridMonth',
]

interface ScheduleCalendarToolbarProps {
  title: string
  view: CalendarViewName
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onViewChange: (view: CalendarViewName) => void
  onAddEvent: () => void
}

export function ScheduleCalendarToolbar({
  title,
  view,
  onToday,
  onPrev,
  onNext,
  onViewChange,
  onAddEvent,
}: ScheduleCalendarToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-3 pb-3">
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" onClick={onAddEvent} aria-label={t('schedules.event.add')}>
          <Plus />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onToday}>
          {t('schedules.calendar.today')}
        </Button>
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onPrev}
            aria-label={t('schedules.calendar.previous')}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onNext}
            aria-label={t('schedules.calendar.next')}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <h2 className="text-primary text-base font-medium">{title}</h2>

      <Select
        value={view}
        onValueChange={(next) => {
          onViewChange(next as CalendarViewName)
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIEW_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`schedules.calendar.view.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
