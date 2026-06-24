import type { EventInput } from '@fullcalendar/core'

import { CONTENT_COLOR, SCREEN_OFF_COLOR } from '@/features/schedules/lib/scheduleColors'
import {
  composeLocal,
  durationMinutes,
  weekdayCode,
} from '@/features/schedules/lib/scheduleDates'
import type { ScheduleEvent } from '@/features/schedules/types/schedule.types'

const WEEKDAY_CODES = ['mo', 'tu', 'we', 'th', 'fr'] as const

/** rrule option fragment for a repeating event, anchored on its start date. */
function repeatRule(event: ScheduleEvent): Record<string, unknown> | null {
  switch (event.repeat) {
    case 'daily':
      return { freq: 'daily' }
    case 'weekdays':
      return { freq: 'weekly', byweekday: [...WEEKDAY_CODES] }
    case 'weekly':
      return { freq: 'weekly', byweekday: [weekdayCode(event.startDate)] }
    case 'monthly':
      return {
        freq: 'monthly',
        bymonthday: [Number(event.startDate.slice(8, 10))],
      }
    case 'yearly':
      return {
        freq: 'yearly',
        bymonth: [Number(event.startDate.slice(5, 7))],
        bymonthday: [Number(event.startDate.slice(8, 10))],
      }
    default:
      return null
  }
}

/**
 * Maps a schedule event to a FullCalendar input. Times are emitted as
 * timezone-naive wall-clock strings; with the calendar's `timeZone="local"`
 * they render exactly as typed (no conversion). Recurring events use the rrule
 * plugin with a duration; excluded occurrences are dropped via `exdate`.
 */
export function scheduleEventToInput(event: ScheduleEvent): EventInput {
  const color = event.type === 'screen_off' ? SCREEN_OFF_COLOR : CONTENT_COLOR

  const base: EventInput = {
    id: event.id,
    title: event.name ?? '',
    backgroundColor: color.background,
    borderColor: color.border,
    textColor: '#111827',
    editable: true,
    classNames: event.type === 'screen_off' ? ['fc-event-screen-off'] : [],
    extendedProps: { scheduleEvent: event },
  }

  const rule = repeatRule(event)
  if (!rule) {
    return {
      ...base,
      start: composeLocal(event.startDate, event.startTime),
      end: composeLocal(event.endDate, event.endTime),
    }
  }

  return {
    ...base,
    rrule: {
      ...rule,
      dtstart: composeLocal(event.startDate, event.startTime),
      until: composeLocal(event.endDate, '23:59'),
    },
    duration: { minutes: durationMinutes(event.startTime, event.endTime) },
    ...(event.excludedDates.length > 0
      ? { exdate: event.excludedDates.map((date) => composeLocal(date, event.startTime)) }
      : {}),
  }
}

export function scheduleEventsToInputs(events: ScheduleEvent[]): EventInput[] {
  return events.map(scheduleEventToInput)
}
