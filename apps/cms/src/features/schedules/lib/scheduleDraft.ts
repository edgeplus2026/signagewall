import type {
  CreateScheduleRequest,
  Schedule,
  ScheduleContentRef,
  ScheduleEvent,
  ScheduleEventInput,
  UpdateScheduleRequest,
} from '@/features/schedules/types/schedule.types'

export interface ScheduleDraft {
  name: string
  description: string
  events: ScheduleEvent[]
  filler: ScheduleContentRef | null
  screenIds: string[]
}

const MONGO_ID = /^[0-9a-fA-F]{24}$/

/** Client-only events carry a `tmp-` id so they can be stripped before saving. */
export function isPersistedId(id: string): boolean {
  return MONGO_ID.test(id)
}

export function newEventId(): string {
  // `crypto.randomUUID` is only defined in secure contexts (https / localhost),
  // so fall back to a random string when it's unavailable (e.g. a LAN-IP dev URL)
  // to avoid throwing while staging a new event.
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `tmp-${uuid}`
}

export function emptyDraft(): ScheduleDraft {
  return { name: '', description: '', events: [], filler: null, screenIds: [] }
}

export function scheduleToDraft(
  schedule: Schedule,
  screenIds: string[],
): ScheduleDraft {
  return {
    name: schedule.name,
    description: schedule.description ?? '',
    events: [...schedule.events].sort((a, b) => a.order - b.order),
    filler: schedule.filler,
    screenIds: [...screenIds].sort(),
  }
}

export function draftToCreateRequest(draft: ScheduleDraft): CreateScheduleRequest {
  return {
    name: draft.name.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    ...(draft.filler ? { filler: draft.filler } : {}),
  }
}

export function draftToUpdateRequest(draft: ScheduleDraft): UpdateScheduleRequest {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    filler: draft.filler, // null clears, object sets
  }
}

/** Maps draft events to the replace-events payload, re-indexed by array order. */
export function draftEventsToInput(events: ScheduleEvent[]): ScheduleEventInput[] {
  return events.map((event) => ({
    ...(isPersistedId(event.id) ? { id: event.id } : {}),
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
    repeat: event.repeat,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    ...(event.excludedDates.length > 0
      ? { excludedDates: event.excludedDates }
      : {}),
  }))
}

/** Builds a fresh draft event with a temp id and the given fields. */
export function makeDraftEvent(
  fields: Omit<ScheduleEvent, 'id' | 'order' | 'excludedDates'> &
    Partial<Pick<ScheduleEvent, 'excludedDates'>>,
  order: number,
): ScheduleEvent {
  return {
    id: newEventId(),
    order,
    excludedDates: fields.excludedDates ?? [],
    ...fields,
  }
}
