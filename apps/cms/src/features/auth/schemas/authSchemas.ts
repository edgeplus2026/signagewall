import type { TFunction } from 'i18next'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { z } from 'zod'

const PASSWORD_MIN = 6
const NAME_MIN = 2

export const createLoginSchema = (t: TFunction) =>
  z.object({
    email: z.email(t('validation.emailInvalid')),
    password: z.string().min(PASSWORD_MIN, t('validation.passwordMin', { min: PASSWORD_MIN })),
  })

export const createRegisterSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(NAME_MIN, t('validation.nameMin', { min: NAME_MIN })),
    email: z.email(t('validation.emailInvalid')),
    phone: z
      .string()
      .min(1, t('validation.phoneRequired'))
      .refine((value) => isValidPhoneNumber(value), t('validation.phoneInvalid')),
    company: z.string().optional(),
    password: z.string().min(PASSWORD_MIN, t('validation.passwordMin', { min: PASSWORD_MIN })),
  })

export const createForgotPasswordSchema = (t: TFunction) =>
  z.object({
    email: z.email(t('validation.emailInvalid')),
  })

export const createResetPasswordSchema = (t: TFunction) =>
  z
    .object({
      password: z.string().min(PASSWORD_MIN, t('validation.passwordMin', { min: PASSWORD_MIN })),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    })

export type LoginSchema = z.infer<ReturnType<typeof createLoginSchema>>
export type RegisterSchema = z.infer<ReturnType<typeof createRegisterSchema>>
export type ForgotPasswordSchema = z.infer<ReturnType<typeof createForgotPasswordSchema>>
export type ResetPasswordSchema = z.infer<ReturnType<typeof createResetPasswordSchema>>
