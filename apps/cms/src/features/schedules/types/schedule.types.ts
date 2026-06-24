export type ScheduleViewMode = 'grid' | 'list'

export type ScheduleEventType = 'content' | 'screen_off'

/** Content types are playlist and media only — no Layout in this product. */
export type ScheduleContentType = 'playlist' | 'media'

export type ScheduleFit = 'fit' | 'crop' | 'stretch'

/** Repeat options; map 1:1 to the backend `ScheduleRepeat` enum. */
export type ScheduleRepeat =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'yearly'

/** Which occurrences a recurring-event edit applies to. */
export type RecurringEditScope = 'this' | 'following' | 'all'

export interface ScheduleContentRef {
  contentType: ScheduleContentType
  mediaId?: string
  playlistId?: string
  fit: ScheduleFit
}

export interface ScheduleEvent {
  id: string
  type: ScheduleEventType
  name?: string
  contentType?: ScheduleContentType
  mediaId?: string
  playlistId?: string
  fit?: ScheduleFit
  repeat: ScheduleRepeat
  /** Local wall-clock 'YYYY-MM-DD'. */
  startDate: string
  endDate: string
  /** Local wall-clock 'HH:mm'. */
  startTime: string
  endTime: string
  /** Local 'YYYY-MM-DD' occurrences removed from a recurring series. */
  excludedDates: string[]
  /** Display + overlap priority; lower wins. */
  order: number
  /** Set by the API when the referenced content was deleted out-of-band. */
  contentMissing?: boolean
}

export interface ScheduleSummary {
  id: string
  name: string
  eventCount: number
  assignedScreenCount: number
  createdAt: string
  updatedAt: string
}

export interface ScheduleDetail extends ScheduleSummary {
  description?: string
  filler: ScheduleContentRef | null
}

export type Schedule = ScheduleDetail & {
  events: ScheduleEvent[]
}

export interface CreateScheduleRequest {
  name: string
  description?: string
  filler?: ScheduleContentRef
}

export interface UpdateScheduleRequest {
  name?: string
  description?: string
  /** `null` clears the filler; an object sets it; omitted leaves it. */
  filler?: ScheduleContentRef | null
}

export interface ScheduleEventInput {
  /** Present only for events that already exist server-side (a Mongo id). */
  id?: string
  type: ScheduleEventType
  name?: string
  contentType?: ScheduleContentType
  mediaId?: string
  playlistId?: string
  fit?: ScheduleFit
  repeat: ScheduleRepeat
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  excludedDates?: string[]
}

export interface ReplaceScheduleEventsRequest {
  events: ScheduleEventInput[]
  /** Lost-update protection, mirrors playlists/screens. */
  expectedUpdatedAt?: string
}

export interface AssignScreensRequest {
  screenIds: string[]
}
