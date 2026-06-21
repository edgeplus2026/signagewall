import { DateTime, IANAZone } from 'luxon';

import {
  ScreenAvailability,
  WeekdayKey,
} from '../schemas/screen.schema';

/**
 * Semantic validation beyond what the DTO enforces (format/enum/timezone). The
 * value is also the i18n key suffix under `screens.availability.*`.
 */
export enum AvailabilityValidationError {
  INVALID_TIMEZONE = 'invalidTimezone',
  INVALID_TIME_RANGE = 'invalidTimeRange',
  INVALID_DATE = 'invalidDate',
  INVALID_DATE_RANGE = 'invalidDateRange',
  INCOMPLETE_WEEKLY = 'incompleteWeekly',
}

const ALL_WEEKDAYS: WeekdayKey[] = Object.values(WeekdayKey);

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

function isRealDate(value: string): boolean {
  const dt = DateTime.fromFormat(value, 'yyyy-MM-dd');
  return dt.isValid;
}

/**
 * Returns the first semantic problem, or `null` when the availability is valid.
 *
 * All blocks (timezone, weekly, special) are validated regardless of the active
 * `mode`, because the stored document always carries every block and switching
 * modes later must never expose invalid data.
 */
export function validateAvailability(
  availability: ScreenAvailability,
): AvailabilityValidationError | null {
  if (!IANAZone.isValidZone(availability.timezone)) {
    return AvailabilityValidationError.INVALID_TIMEZONE;
  }

  // Weekly: all 7 distinct days, and each enabled day's start strictly before end.
  const days = availability.weekly.map((entry) => entry.day);
  const distinct = new Set(days);
  if (
    distinct.size !== ALL_WEEKDAYS.length ||
    days.length !== ALL_WEEKDAYS.length
  ) {
    return AvailabilityValidationError.INCOMPLETE_WEEKLY;
  }
  for (const entry of availability.weekly) {
    // Only enabled days run; disabled days carry placeholder times.
    if (entry.enabled && toMinutes(entry.start) >= toMinutes(entry.end)) {
      return AvailabilityValidationError.INVALID_TIME_RANGE;
    }
  }

  // Special: real calendar dates, start date on/before end date, start time before end time.
  const { special } = availability;
  if (!isRealDate(special.startDate) || !isRealDate(special.endDate)) {
    return AvailabilityValidationError.INVALID_DATE;
  }
  if (special.endDate < special.startDate) {
    return AvailabilityValidationError.INVALID_DATE_RANGE;
  }
  if (toMinutes(special.start) >= toMinutes(special.end)) {
    return AvailabilityValidationError.INVALID_TIME_RANGE;
  }

  return null;
}
