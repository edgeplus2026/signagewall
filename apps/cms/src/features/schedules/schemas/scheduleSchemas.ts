import type { TFunction } from 'i18next'
import { z } from 'zod'

import { composeLocal } from '@/features/schedules/lib/scheduleDates'

export function createScheduleSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t('schedules.validation.nameRequired'))
      .max(200, t('schedules.validation.nameMax', { max: 200 })),
    description: z
      .string()
      .max(2000, t('schedules.validation.descriptionMax', { max: 2000 }))
      .optional(),
  })
}

export type ScheduleSchema = z.infer<ReturnType<typeof createScheduleSchema>>

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Validation for the New/Edit Event modal. */
export function createScheduleEventSchema(t: TFunction) {
  return z
    .object({
      type: z.enum(['content', 'screen_off']),
      contentType: z.enum(['playlist', 'media']),
      contentId: z.string(),
      fit: z.enum(['fit', 'crop', 'stretch']),
      startDate: z.string().regex(DATE, t('schedules.validation.invalidDate')),
      startTime: z.string().regex(TIME, t('schedules.validation.invalidTime')),
      endDate: z.string().regex(DATE, t('schedules.validation.invalidDate')),
      endTime: z.string().regex(TIME, t('schedules.validation.invalidTime')),
      repeat: z.enum(['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']),
    })
    .superRefine((values, ctx) => {
      if (values.type === 'content' && !values.contentId) {
        ctx.addIssue({
          code: 'custom',
          path: ['contentId'],
          message: t('schedules.validation.contentRequired'),
        })
      }

      const start = composeLocal(values.startDate, values.startTime)
      const end = composeLocal(values.endDate, values.endTime)
      // Non-repeating events are one continuous block (must end after start).
      // Repeating events allow overnight (end-of-day < start-of-day), but never
      // a zero-length window.
      if (values.repeat === 'none') {
        if (end <= start) {
          ctx.addIssue({
            code: 'custom',
            path: ['endTime'],
            message: t('schedules.validation.endAfterStart'),
          })
        }
      } else if (
        values.startDate === values.endDate &&
        values.startTime === values.endTime
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['endTime'],
          message: t('schedules.validation.endAfterStart'),
        })
      }
    })
}

export type ScheduleEventSchema = z.infer<
  ReturnType<typeof createScheduleEventSchema>
>
