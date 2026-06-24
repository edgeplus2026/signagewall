import type { EventContentArg, EventInput } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import rrulePlugin from '@fullcalendar/rrule'
import timeGridPlugin from '@fullcalendar/timegrid'
import { format } from 'date-fns'
import { PowerOff } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import './scheduleCalendar.css'
import {
  ScheduleCalendarToolbar,
  type CalendarViewName,
} from '@/features/schedules/components/ScheduleCalendarToolbar'
import { splitLocal } from '@/features/schedules/lib/scheduleDates'
import { scheduleEventToInput } from '@/features/schedules/lib/scheduleFullCalendar'
import type { ScheduleEvent } from '@/features/schedules/types/schedule.types'

export interface CalendarEventChange {
  event: ScheduleEvent
  isRecurring: boolean
  originalDate: string
  newStartDate: string
  newStartTime: string
  newEndDate: string
  newEndTime: string
  revert: () => void
}

interface ScheduleCalendarProps {
  events: ScheduleEvent[]
  onAddEvent: () => void
  onEventClick: (event: ScheduleEvent) => void
  onSelectRange: (
    start: { date: string; time: string },
    end: { date: string; time: string },
  ) => void
  onEventChange: (change: CalendarEventChange) => void
}

export function ScheduleCalendar({
  events,
  onAddEvent,
  onEventClick,
  onSelectRange,
  onEventChange,
}: ScheduleCalendarProps) {
  const { t } = useTranslation()
  const calendarRef = useRef<FullCalendar>(null)
  const [view, setView] = useState<CalendarViewName>('timeGridWeek')
  const [title, setTitle] = useState('')

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      events.map((event) => {
        const input = scheduleEventToInput(event)
        input.title =
          event.type === 'screen_off'
            ? t('schedules.event.type.screenOff')
            : (event.name ?? '') || t('schedules.event.untitled')
        return input
      }),
    [events, t],
  )

  const api = () => calendarRef.current?.getApi()

  const changeView = (next: CalendarViewName) => {
    setView(next)
    api()?.changeView(next)
  }

  const renderEventContent = (arg: EventContentArg) => {
    const event = arg.event.extendedProps.scheduleEvent as ScheduleEvent | undefined
    const isOff = event?.type === 'screen_off'

    // Month view: compact single-line chip (title … time).
    if (arg.view.type === 'dayGridMonth') {
      return (
        <div className="flex w-full items-center gap-1 overflow-hidden">
          {isOff && <PowerOff className="size-3 shrink-0" />}
          <span className="truncate font-medium">{arg.event.title}</span>
          {arg.timeText && (
            <span className="ml-auto shrink-0 text-[0.7rem] opacity-70">
              {arg.timeText}
            </span>
          )}
        </div>
      )
    }

    // Week / day view: title stacked over the time range.
    return (
      <div className="flex h-full flex-col gap-0.5 overflow-hidden leading-tight">
        <span className="flex items-center gap-1 truncate font-semibold">
          {isOff && <PowerOff className="size-3 shrink-0" />}
          <span className="truncate">{arg.event.title}</span>
        </span>
        {arg.timeText && <span className="truncate opacity-80">{arg.timeText}</span>}
      </div>
    )
  }

  return (
    <div className="bg-panel flex min-h-0 flex-1 flex-col rounded-xl p-4">
      <ScheduleCalendarToolbar
        title={title}
        view={view}
        onToday={() => api()?.today()}
        onPrev={() => api()?.prev()}
        onNext={() => api()?.next()}
        onViewChange={changeView}
        onAddEvent={onAddEvent}
      />
      <div className="min-h-0 flex-1">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
          initialView="timeGridWeek"
          timeZone="local"
          headerToolbar={false}
          height="100%"
          nowIndicator
          allDaySlot={false}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:30:00"
          scrollTime="08:00:00"
          firstDay={1}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayHeaderContent={(arg) =>
            arg.view.type.startsWith('timeGrid') ? format(arg.date, 'dd/MM') : arg.text
          }
          eventContent={renderEventContent}
          eventDisplay="block"
          selectable
          selectMirror
          editable
          dayMaxEvents={false}
          events={calendarEvents}
          datesSet={(arg) => {
            setTitle(arg.view.title)
            setView(arg.view.type as CalendarViewName)
          }}
          select={(arg) => {
            const start = splitLocal(arg.startStr)
            const end = splitLocal(arg.endStr)
            onSelectRange(start, end)
            api()?.unselect()
          }}
          eventClick={(arg) => {
            const event = arg.event.extendedProps.scheduleEvent as
              | ScheduleEvent
              | undefined
            if (event) onEventClick(event)
          }}
          eventDrop={(arg) => {
            const event = arg.event.extendedProps.scheduleEvent as
              | ScheduleEvent
              | undefined
            if (!event) return
            const start = splitLocal(arg.event.startStr)
            const end = arg.event.endStr ? splitLocal(arg.event.endStr) : start
            const original = splitLocal(arg.oldEvent.startStr)
            onEventChange({
              event,
              isRecurring: event.repeat !== 'none',
              originalDate: original.date,
              newStartDate: start.date,
              newStartTime: start.time,
              newEndDate: end.date,
              newEndTime: end.time,
              revert: arg.revert,
            })
          }}
          eventResize={(arg) => {
            const event = arg.event.extendedProps.scheduleEvent as
              | ScheduleEvent
              | undefined
            if (!event) return
            const start = splitLocal(arg.event.startStr)
            const end = arg.event.endStr ? splitLocal(arg.event.endStr) : start
            const original = splitLocal(arg.oldEvent.startStr)
            onEventChange({
              event,
              isRecurring: event.repeat !== 'none',
              originalDate: original.date,
              newStartDate: start.date,
              newStartTime: start.time,
              newEndDate: end.date,
              newEndTime: end.time,
              revert: arg.revert,
            })
          }}
        />
      </div>
    </div>
  )
}
