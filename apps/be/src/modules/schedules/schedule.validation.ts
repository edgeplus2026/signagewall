import { DateTime } from 'luxon';

import {
  ScheduleContentType,
  ScheduleEventType,
  ScheduleEventValue,
  ScheduleRepeat,
} from './schemas/schedule.schema';

/** Max events a single schedule may hold. */
export const MAX_SCHEDULE_EVENTS = 200;

/**
 * Semantic validation beyond what the DTO enforces (format/enum). Each value
 * doubles as the i18n key suffix under `schedules.event.*`.
 */
export enum ScheduleValidationError {
  INVALID_DATE = 'invalidDate',
  INVALID_DATE_RANGE = 'invalidDateRange',
  INVALID_TIME = 'invalidTime',
  INVALID_TIME_RANGE = 'invalidTimeRange',
  MISSING_CONTENT = 'missingContent',
  CONTENT_ON_OFF_EVENT = 'contentOnOffEvent',
  INVALID_REPEAT = 'invalidRepeat',
  TOO_MANY_EVENTS = 'tooManyEvents',
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  return DATE_PATTERN.test(value) && DateTime.fromFormat(value, 'yyyy-MM-dd').isValid;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/** Returns the first semantic problem in a single event, or `null` when valid. */
export function validateScheduleEvent(
  event: ScheduleEventValue,
): ScheduleValidationError | null {
  if (!Object.values(ScheduleRepeat).includes(event.repeat)) {
    return ScheduleValidationError.INVALID_REPEAT;
  }

  if (!isRealDate(event.startDate) || !isRealDate(event.endDate)) {
    return ScheduleValidationError.INVALID_DATE;
  }
  if (event.endDate < event.startDate) {
    return ScheduleValidationError.INVALID_DATE_RANGE;
  }

  if (!TIME_PATTERN.test(event.startTime) || !TIME_PATTERN.test(event.endTime)) {
    return ScheduleValidationError.INVALID_TIME;
  }

  if (event.repeat === ScheduleRepeat.NONE) {
    // A non-repeating event is one continuous block; its composed end must be
    // strictly after its composed start (multi-day overnight is fine).
    const start = `${event.startDate}T${event.startTime}`;
    const end = `${event.endDate}T${event.endTime}`;
    if (end <= start) {
      return ScheduleValidationError.INVALID_TIME_RANGE;
    }
  } else if (toMinutes(event.startTime) === toMinutes(event.endTime)) {
    // Recurring windows may run overnight (end < start), but never zero-length.
    return ScheduleValidationError.INVALID_TIME_RANGE;
  }

  if (event.type === ScheduleEventType.CONTENT) {
    if (!event.contentType) {
      return ScheduleValidationError.MISSING_CONTENT;
    }
    if (
      event.contentType === ScheduleContentType.MEDIA
        ? !event.mediaId
        : !event.playlistId
    ) {
      return ScheduleValidationError.MISSING_CONTENT;
    }
  } else {
    // screen_off events must not carry content.
    if (event.contentType || event.mediaId || event.playlistId) {
      return ScheduleValidationError.CONTENT_ON_OFF_EVENT;
    }
  }

  return null;
}

/** Returns the first problem across all events (incl. the count cap), or `null`. */
export function validateScheduleEvents(
  events: ScheduleEventValue[],
): ScheduleValidationError | null {
  if (events.length > MAX_SCHEDULE_EVENTS) {
    return ScheduleValidationError.TOO_MANY_EVENTS;
  }
  for (const event of events) {
    const error = validateScheduleEvent(event);
    if (error) {
      return error;
    }
  }
  return null;
}
