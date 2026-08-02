import type { TFunction } from 'i18next'
import { z } from 'zod'

const MAX_SCREENS = 10000

/**
 * Number fields are plain `z.number()` rather than `z.coerce.number()`: coerce
 * types the *input* as `unknown`, which react-hook-form's resolver rejects under
 * `exactOptionalPropertyTypes`. The forms register these with
 * `{ valueAsNumber: true }`, so the value is already a number by validation time.
 *
 * The optional text fields default to `''` instead of `undefined` for the same
 * reason — a controlled input needs a string, not a maybe-string.
 */
export const createUpgradeRequestSchema = (t: TFunction) =>
  z.object({
    requestedScreens: z
      .number({ message: t('plans.upgrade.screensRequired') })
      .int(t('plans.upgrade.screensRequired'))
      .min(1, t('plans.upgrade.screensRequired'))
      .max(MAX_SCREENS, t('plans.upgrade.screensMax', { max: MAX_SCREENS })),
    phone: z.string(),
    company: z.string(),
    message: z.string(),
  })

export type UpgradeRequestSchema = z.infer<
  ReturnType<typeof createUpgradeRequestSchema>
>

export const createUpdateUserPlanSchema = (t: TFunction) =>
  z.object({
    plan: z.enum(['free', 'enterprise']),
    screenLimit: z
      .number({ message: t('superAdmin.plan.screenLimitInvalid') })
      .int(t('superAdmin.plan.screenLimitInvalid'))
      .min(0, t('superAdmin.plan.screenLimitInvalid'))
      .max(MAX_SCREENS, t('plans.upgrade.screensMax', { max: MAX_SCREENS })),
  })

export type UpdateUserPlanSchema = z.infer<
  ReturnType<typeof createUpdateUserPlanSchema>
>
