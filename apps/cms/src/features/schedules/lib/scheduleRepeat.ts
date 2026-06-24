import type { ScheduleRepeat } from '@/features/schedules/types/schedule.types'

/** Ordered repeat options shown in the dropdown (kept identical to the backend enum). */
export const SCHEDULE_REPEAT_OPTIONS: ScheduleRepeat[] = [
  'none',
  'daily',
  'weekdays',
  'weekly',
  'monthly',
  'yearly',
]
