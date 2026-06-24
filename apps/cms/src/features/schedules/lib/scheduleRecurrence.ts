import { dayBefore } from '@/features/schedules/lib/scheduleDates'
import { makeDraftEvent } from '@/features/schedules/lib/scheduleDraft'
import type {
  RecurringEditScope,
  ScheduleEvent,
} from '@/features/schedules/types/schedule.types'

export interface OccurrenceEdit {
  /** The occurrence's date before the move (the one being edited). */
  originalDate: string
  newStartDate: string
  newStartTime: string
  newEndDate: string
  newEndTime: string
}

/** The content/identity fields a derived event copies from its series. */
function carriedFields(event: ScheduleEvent) {
  return {
    type: event.type,
    ...(event.name ? { name: event.name } : {}),
    ...(event.type === 'content'
      ? {
          contentType: event.contentType,
          ...(event.mediaId ? { mediaId: event.mediaId } : {}),
          ...(event.playlistId ? { playlistId: event.playlistId } : {}),
          ...(event.fit ? { fit: event.fit } : {}),
        }
      : {}),
  }
}

/**
 * Applies a recurring-event edit to the draft events, returning a new array.
 * - `all`   — shift the series' time-of-day (recurrence days unchanged).
 * - `this`  — exclude the occurrence from the series + add a one-off event.
 * - `following` — truncate the series before the occurrence + start a new one.
 */
export function applyRecurringEdit(
  events: ScheduleEvent[],
  eventId: string,
  scope: RecurringEditScope,
  edit: OccurrenceEdit,
): ScheduleEvent[] {
  const target = events.find((event) => event.id === eventId)
  if (!target) {
    return events
  }

  // Editing the first occurrence "and following" is equivalent to "all".
  const effectiveScope =
    scope === 'following' && edit.originalDate <= target.startDate ? 'all' : scope

  if (effectiveScope === 'all') {
    return events.map((event) =>
      event.id === eventId
        ? { ...event, startTime: edit.newStartTime, endTime: edit.newEndTime }
        : event,
    )
  }

  if (effectiveScope === 'this') {
    const oneOff = makeDraftEvent(
      {
        ...carriedFields(target),
        repeat: 'none',
        startDate: edit.newStartDate,
        endDate: edit.newEndDate,
        startTime: edit.newStartTime,
        endTime: edit.newEndTime,
      },
      events.length,
    )
    return [
      ...events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              excludedDates: [...event.excludedDates, edit.originalDate],
            }
          : event,
      ),
      oneOff,
    ]
  }

  // following
  const newSeries = makeDraftEvent(
    {
      ...carriedFields(target),
      repeat: target.repeat,
      startDate: edit.newStartDate,
      endDate: target.endDate,
      startTime: edit.newStartTime,
      endTime: edit.newEndTime,
    },
    events.length,
  )
  return [
    ...events.map((event) =>
      event.id === eventId
        ? { ...event, endDate: dayBefore(edit.originalDate) }
        : event,
    ),
    newSeries,
  ]
}
