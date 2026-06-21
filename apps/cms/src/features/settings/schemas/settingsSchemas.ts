import type { TFunction } from 'i18next'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { z } from 'zod'

const PASSWORD_MIN = 6
const NAME_MIN = 2

export const createUpdateProfileSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(NAME_MIN, t('validation.nameMin', { min: NAME_MIN })),
    phone: z
      .string()
      .min(1, t('validation.phoneRequired'))
      .refine((value) => isValidPhoneNumber(value), t('validation.phoneInvalid')),
    company: z.string().optional(),
  })

export const createChangePasswordSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, t('settings.security.currentPasswordRequired')),
      password: z.string().min(PASSWORD_MIN, t('validation.passwordMin', { min: PASSWORD_MIN })),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    })

export const createSetPasswordSchema = (t: TFunction) =>
  z
    .object({
      password: z.string().min(PASSWORD_MIN, t('validation.passwordMin', { min: PASSWORD_MIN })),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    })

const FEEDBACK_MESSAGE_MIN = 10
const REPORT_PROBLEM_MIN = 10

export const createFeedbackSchema = (t: TFunction) =>
  z.object({
    rating: z.number().min(1, t('settings.feedback.ratingRequired')).max(5),
    message: z
      .string()
      .min(FEEDBACK_MESSAGE_MIN, t('settings.feedback.messageMin', { min: FEEDBACK_MESSAGE_MIN })),
  })

export const createReportProblemSchema = (t: TFunction) =>
  z.object({
    message: z
      .string()
      .min(
        REPORT_PROBLEM_MIN,
        t('settings.support.reportProblem.messageMin', { min: REPORT_PROBLEM_MIN }),
      ),
  })

export type UpdateProfileSchema = z.infer<ReturnType<typeof createUpdateProfileSchema>>
export type ChangePasswordSchema = z.infer<ReturnType<typeof createChangePasswordSchema>>
export type SetPasswordSchema = z.infer<ReturnType<typeof createSetPasswordSchema>>
export type FeedbackSchema = z.infer<ReturnType<typeof createFeedbackSchema>>
export type ReportProblemSchema = z.infer<ReturnType<typeof createReportProblemSchema>>
